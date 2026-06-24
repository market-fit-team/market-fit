from __future__ import annotations

import argparse
import json
from typing import Any

import numpy as np
import pandas as pd
import tensorflow as tf

from app.models.onboarding_two_tower.train import (
    ITEM_NUMERIC_FEATURES,
    ITEM_STRING_FEATURES,
    USER_NUMERIC_FIELDS,
    USER_STRING_FEATURES,
    _tensor_dict,
    load_model,
)
from app.models.onboarding_two_tower.user_profiles import DEFAULT_USER_PROFILES, load_user_profiles
from app.models.item_catalog.features import build_item_features


def _scale_scores_to_unit_interval(scores: np.ndarray) -> np.ndarray:
    clipped = np.clip(scores.astype(np.float64), -12.0, 12.0)
    scaled = 1.0 / (1.0 + np.exp(-clipped))
    return np.clip(scaled, 1e-6, 1.0 - 1e-6).astype(np.float32)


def _resolve_user_profile(payload: dict[str, Any]) -> pd.DataFrame:
    users = load_user_profiles()
    user_id = str(payload.get("user_id") or "")
    if user_id:
        matched = users[users["user_id"] == user_id]
        if not matched.empty:
            base = matched.iloc[[0]].copy()
        else:
            base = pd.DataFrame([DEFAULT_USER_PROFILES[0]])
    else:
        base = pd.DataFrame([DEFAULT_USER_PROFILES[0]])

    if "profile_name" not in payload or payload["profile_name"] is None:
        payload["profile_name"] = str(base.at[0, "profile_name"])
    payload["user_id"] = user_id or "ad_hoc_user"

    # 샘플 프로필을 기반으로 하되, 프론트에서 넘어온 값만 덮어쓴다.
    for field, value in payload.items():
        if value is not None:
            base.at[0, field] = value
    return base


def predict_with_runtime(
    model: Any,
    metadata: dict[str, Any],
    user_profile: dict[str, Any],
    top_k: int = 5,
) -> dict[str, object]:
    items = build_item_features(data_mode="sample").copy()
    user = _resolve_user_profile(user_profile)

    item_tensors = {
        name: tf.convert_to_tensor(
            _tensor_dict(
                items,
                [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES],
                string_columns=set(ITEM_STRING_FEATURES),
            )[name]
        )
        for name in [*ITEM_STRING_FEATURES, *ITEM_NUMERIC_FEATURES]
    }
    user_tensors = {
        name: tf.convert_to_tensor(
            _tensor_dict(
                user,
                [*USER_STRING_FEATURES, *USER_NUMERIC_FIELDS],
                string_columns=set(USER_STRING_FEATURES),
            )[name]
        )
        for name in [*USER_STRING_FEATURES, *USER_NUMERIC_FIELDS]
    }

    item_embeddings = model.item_model(item_tensors)
    user_embedding = model.user_model(user_tensors)
    raw_scores = tf.linalg.matmul(user_embedding, item_embeddings, transpose_b=True)[0].numpy()
    scaled_scores = _scale_scores_to_unit_interval(raw_scores)
    ranked_indices = np.argsort(raw_scores)[::-1][:top_k]

    recommendations: list[dict[str, object]] = []
    for rank, index in enumerate(ranked_indices, start=1):
        item = items.iloc[int(index)]
        recommendations.append(
            {
                "rank": rank,
                "score": round(float(scaled_scores[int(index)]), 6),
                "item_id": item["item_id"],
                "area_name": item["area_name"],
                "service_category_name": item["service_category_name"],
                "area_profile_type": item["area_profile_type"],
                "sales_amount": float(item["sales_amount"]),
                "weekend_sales_ratio": round(float(item["weekend_sales_ratio"]), 4),
                "evening_sales_ratio": round(float(item["evening_sales_ratio"]), 4),
                "resident_population": int(item["resident_population"]),
                "worker_population": int(item["worker_population"]),
                "subway_commercial_trend_score": round(float(item["subway_commercial_trend_score"]), 4),
                "category_opportunity_score": round(float(item["category_opportunity_score"]), 4),
                "demand_gap_score": round(float(item["demand_gap_score"]), 4),
            }
        )

    return {
        "user_profile": user.iloc[0].to_dict(),
        "top_k": top_k,
        "trained_at": metadata["trained_at"],
        "recommendations": recommendations,
    }


def predict(args: argparse.Namespace) -> dict[str, object]:
    model, metadata = load_model()
    return predict_with_runtime(
        model=model,
        metadata=metadata,
        user_profile={
            "user_id": args.user_id,
            "preferred_category_code": args.preferred_category_code,
            "budget_level": args.budget_level,
            "stability_level": args.stability_level,
            "subway_dependency_level": args.subway_dependency_level,
            "weekend_preference_level": args.weekend_preference_level,
            "evening_preference_level": args.evening_preference_level,
            "resident_focus_level": args.resident_focus_level,
            "worker_focus_level": args.worker_focus_level,
            "rent_sensitivity_level": args.rent_sensitivity_level,
            "competition_tolerance_level": args.competition_tolerance_level,
        },
        top_k=args.top_k,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=str, default=None)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--preferred-category-code", type=str, default=None)
    parser.add_argument("--budget-level", type=float, default=None)
    parser.add_argument("--stability-level", type=float, default=None)
    parser.add_argument("--subway-dependency-level", type=float, default=None)
    parser.add_argument("--weekend-preference-level", type=float, default=None)
    parser.add_argument("--evening-preference-level", type=float, default=None)
    parser.add_argument("--resident-focus-level", type=float, default=None)
    parser.add_argument("--worker-focus-level", type=float, default=None)
    parser.add_argument("--rent-sensitivity-level", type=float, default=None)
    parser.add_argument("--competition-tolerance-level", type=float, default=None)
    parsed_args = parser.parse_args()
    print(json.dumps(predict(parsed_args), ensure_ascii=False, indent=2))
