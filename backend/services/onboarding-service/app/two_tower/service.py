from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.models.onboarding_two_tower.runtime import evaluation_payload, predict_payload
from app.two_tower.codecs import build_share_path
from app.two_tower.contracts import PredictResponse, UserProfilePayload
from app.two_tower.repository import AreaPredictionCacheRepository

prediction_cache_repository = AreaPredictionCacheRepository()
RECOMMENDATION_SCORE_SCALE = "sigmoid_zero_to_one_v1"


def build_model_signature(metadata: dict[str, Any]) -> str:
    return f"{metadata['model_id']}:{metadata['trained_at']}:{RECOMMENDATION_SCORE_SCALE}"


def build_share_url(result_code: str) -> str:
    return f"{settings.frontend_result_base_url}/{result_code}"


async def resolve_area_prediction(
    session: AsyncSession,
    *,
    area_profile_key: str,
    user_profile: dict[str, Any],
    selected_category_code: str,
    top_k: int,
) -> PredictResponse:
    validated_profile = UserProfilePayload.model_validate(user_profile).model_dump()
    metadata = await run_in_threadpool(evaluation_payload)
    model_signature = build_model_signature(metadata)

    cached = await prediction_cache_repository.get(
        session=session,
        area_profile_key=area_profile_key,
        selected_category_code=selected_category_code,
        model_signature=model_signature,
        top_k=top_k,
    )
    if cached is None:
        raw_prediction = await run_in_threadpool(
            predict_payload,
            user_profile=validated_profile,
            top_k=top_k,
        )
        prediction_payload = dict(raw_prediction)
        prediction_payload["model_signature"] = model_signature
        await prediction_cache_repository.upsert(
            session=session,
            area_profile_key=area_profile_key,
            selected_category_code=selected_category_code,
            model_signature=model_signature,
            top_k=top_k,
            prediction_json=prediction_payload,
        )
    else:
        prediction_payload = dict(cached.prediction_json)

    prediction_payload["user_profile"] = validated_profile
    prediction_payload["model_signature"] = model_signature
    return PredictResponse.model_validate(prediction_payload)


__all__ = ["build_model_signature", "build_share_path", "build_share_url", "resolve_area_prediction"]
