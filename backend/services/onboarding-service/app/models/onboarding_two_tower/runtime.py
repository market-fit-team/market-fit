from __future__ import annotations

from typing import Any

from app.models.onboarding_two_tower.user_profiles import (
    USER_CONTROL_SPECS,
    category_options,
    load_user_profiles,
)
from app.models.onboarding_two_tower.predict import predict_with_runtime
from app.models.onboarding_two_tower.train import load_model, train_and_save
from app.models.item_catalog.features import build_item_features
from app.two_tower.contracts import UserProfilePayload

_RUNTIME_MODEL: Any | None = None
_RUNTIME_METADATA: dict[str, Any] | None = None


def _sample_profiles() -> list[dict[str, Any]]:
    users = load_user_profiles().to_dict(orient="records")
    return [UserProfilePayload(**user).model_dump() for user in users]


def get_runtime() -> tuple[Any, dict[str, Any]]:
    global _RUNTIME_MODEL, _RUNTIME_METADATA
    # 학습 후 첫 요청부터는 같은 프로세스 안에서 모델과 metadata를 재사용한다.
    if _RUNTIME_MODEL is None or _RUNTIME_METADATA is None:
        _RUNTIME_MODEL, _RUNTIME_METADATA = load_model()
    return _RUNTIME_MODEL, _RUNTIME_METADATA


def train_runtime(epochs: int) -> dict[str, Any]:
    global _RUNTIME_MODEL, _RUNTIME_METADATA
    metadata = train_and_save(epochs=epochs)
    _RUNTIME_MODEL, _RUNTIME_METADATA = load_model()
    return metadata


def evaluation_payload() -> dict[str, Any]:
    _, metadata = get_runtime()
    return metadata


def catalog_payload() -> dict[str, Any]:
    _, metadata = get_runtime()
    items = build_item_features(data_mode="sample").copy()
    item_preview = (
        items.sort_values(["sales_amount", "subway_commercial_trend_score"], ascending=[False, False])
        .head(8)[
            [
                "item_id",
                "area_name",
                "service_category_name",
                "area_profile_type",
                "sales_amount",
                "weekend_sales_ratio",
                "evening_sales_ratio",
            ]
        ]
        .to_dict(orient="records")
    )
    return {
        "model_id": metadata["model_id"],
        "feature_controls": USER_CONTROL_SPECS,
        "category_options": category_options(),
        "sample_profiles": _sample_profiles(),
        "item_preview": item_preview,
        "evaluation": metadata,
    }


def predict_payload(user_profile: dict[str, Any], top_k: int) -> dict[str, Any]:
    model, metadata = get_runtime()
    return predict_with_runtime(
        model=model,
        metadata=metadata,
        user_profile=user_profile,
        top_k=top_k,
    )
