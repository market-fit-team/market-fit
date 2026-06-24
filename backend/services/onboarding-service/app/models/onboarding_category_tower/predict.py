from __future__ import annotations

import argparse
import json
from typing import Any

import numpy as np
import pandas as pd
import tensorflow as tf

from app.models.category_profile.features import build_category_profiles
from app.models.onboarding_category_tower.contracts import (
    CategoryPredictResponse,
    CategoryRecommendation,
    CategoryUserProfilePayload,
)
from app.models.onboarding_category_tower.train import (
    ITEM_NUMERIC_FEATURES,
    ITEM_STRING_FEATURES,
    USER_NUMERIC_FIELDS,
    _tensor_dict,
    load_model,
)
from app.models.onboarding_category_tower.user_profiles import sample_user_profiles


def _scale_scores_to_unit_interval(scores: np.ndarray) -> np.ndarray:
    clipped = np.clip(scores.astype(np.float64), -12.0, 12.0)
    scaled = 1.0 / (1.0 + np.exp(-clipped))
    return np.clip(scaled, 1e-6, 1.0 - 1e-6).astype(np.float32)


def _resolve_user_profile(payload: dict[str, Any], data_mode: str) -> pd.DataFrame:
    samples = sample_user_profiles(data_mode=data_mode)
    user_id = str(payload.get("user_id") or "")
    if user_id:
        matched = [row for row in samples if str(row["user_id"]) == user_id]
        base = dict(matched[0]) if matched else dict(samples[0] if samples else {})
    else:
        base = dict(samples[0] if samples else {})

    merged = {**base, **{key: value for key, value in payload.items() if value is not None}}
    if "user_id" not in merged or not merged["user_id"]:
        merged["user_id"] = user_id or "category_user"
    if "profile_name" not in merged or not merged["profile_name"]:
        merged["profile_name"] = "업종 추천 프로필"
    validated = CategoryUserProfilePayload.model_validate(merged)
    return pd.DataFrame([validated.model_dump()])


def predict_with_runtime(
    model: Any,
    metadata: dict[str, Any],
    user_profile: dict[str, Any],
    top_k: int = 5,
    data_mode: str = "sample",
) -> dict[str, Any]:
    items = build_category_profiles(data_mode=data_mode, trainable_only=True).copy()
    user = _resolve_user_profile(user_profile, data_mode=data_mode)

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
        name: tf.convert_to_tensor(_tensor_dict(user, USER_NUMERIC_FIELDS)[name])
        for name in USER_NUMERIC_FIELDS
    }

    item_embeddings = model.item_model(item_tensors)
    user_embedding = model.user_model(user_tensors)
    raw_scores = tf.linalg.matmul(user_embedding, item_embeddings, transpose_b=True)[0].numpy()
    scaled_scores = _scale_scores_to_unit_interval(raw_scores)
    ranked_indices = np.argsort(raw_scores)[::-1][:top_k]

    recommendations: list[dict[str, Any]] = []
    for rank, index in enumerate(ranked_indices, start=1):
        item = items.iloc[int(index)]
        recommendations.append(
            CategoryRecommendation(
                rank=rank,
                score=round(float(scaled_scores[int(index)]), 6),
                service_category_code=str(item["service_category_code"]),
                service_category_name=str(item["service_category_name"]),
                category_group=str(item["category_group"]),
                stability_prior_score=round(float(item["stability_prior_score"]), 6),
                competition_pressure_score=round(float(item["competition_pressure_score"]), 6),
                weekend_sales_ratio=round(float(item["weekend_sales_ratio"]), 6),
                evening_sales_ratio=round(float(item["evening_sales_ratio"]), 6),
                late_night_sales_ratio=round(float(item["late_night_sales_ratio"]), 6),
                female_sales_ratio=round(float(item["female_sales_ratio"]), 6),
                franchise_ratio=round(float(item["franchise_ratio"]), 6),
            ).model_dump()
        )

    return CategoryPredictResponse(
        trained_at=metadata["trained_at"],
        model_id=metadata["model_id"],
        top_k=top_k,
        user_profile=CategoryUserProfilePayload.model_validate(user.iloc[0].to_dict()),
        recommendations=[CategoryRecommendation.model_validate(row) for row in recommendations],
    ).model_dump()


def predict(args: argparse.Namespace) -> dict[str, Any]:
    payload = json.loads(args.profile_json) if args.profile_json else {}
    if args.user_id:
        payload["user_id"] = args.user_id
    model, metadata = load_model(data_mode=args.data_mode)
    return predict_with_runtime(
        model=model,
        metadata=metadata,
        user_profile=payload,
        top_k=args.top_k,
        data_mode=args.data_mode,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=str, default=None)
    parser.add_argument("--profile-json", type=str, default=None)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--data-mode", type=str, default="sample")
    parsed_args = parser.parse_args()
    print(json.dumps(predict(parsed_args), ensure_ascii=False, indent=2))
