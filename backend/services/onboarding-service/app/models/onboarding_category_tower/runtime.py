from __future__ import annotations

from typing import Any

from app.models.category_profile.features import build_category_profiles, category_options
from app.models.onboarding_category_tower.predict import predict_with_runtime
from app.models.onboarding_category_tower.train import load_model, train_and_save
from app.models.onboarding_category_tower.user_profiles import (
    USER_CONTROL_SPECS,
    sample_user_profiles,
)

_RUNTIME_MODEL: Any | None = None
_RUNTIME_METADATA: dict[str, Any] | None = None


def get_runtime() -> tuple[Any, dict[str, Any]]:
    global _RUNTIME_MODEL, _RUNTIME_METADATA
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
    items = build_category_profiles(data_mode="sample", trainable_only=True).copy()
    preview = (
        items.sort_values(["stability_prior_score", "competition_pressure_score"], ascending=[False, True])
        .head(8)[
            [
                "service_category_code",
                "service_category_name",
                "category_group",
                "stability_prior_score",
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
        "sample_profiles": sample_user_profiles(),
        "category_preview": preview,
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
