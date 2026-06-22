from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.models.onboarding_two_tower.runtime import (
    catalog_payload,
    evaluation_payload,
    predict_payload,
)
from app.two_tower.codecs import (
    DEFAULT_SURVEY_CODE,
    PROFILE_CODE_PREFIX,
    PROFILE_CODE_VERSION,
    build_share_path,
    decode_profile_code_details,
    encode_profile_code,
)
from app.two_tower.contracts import (
    CatalogResponse,
    PredictResponse,
    ResolvedProfileResponse,
    SaveUserTowerProfileRequest,
    StoredUserTowerProfile,
    UserProfilePayload,
)
from app.two_tower.repository import (
    UserTowerPredictionCacheRepository,
    UserTowerProfileRepository,
)

profile_repository = UserTowerProfileRepository()
prediction_cache_repository = UserTowerPredictionCacheRepository()
RECOMMENDATION_SCORE_SCALE = "minmax_zero_to_one_v1"


def build_model_signature(metadata: dict[str, Any]) -> str:
    return f"{metadata['model_id']}:{metadata['trained_at']}:{RECOMMENDATION_SCORE_SCALE}"


def build_share_url(profile_code: str) -> str:
    return f"{settings.frontend_two_tower_base_url}/{profile_code}"


def _build_profile_state(
    auth_user_uuid: str | None,
    profile_code: str,
    source: str,
    updated_at: str | None,
    raw_answers: dict[str, Any] | None,
    user_profile: dict[str, Any],
    survey_response_id: int | None = None,
    survey_slug: str | None = None,
    survey_version: int | None = None,
    survey_code: str | None = None,
    scoring_version: str | None = None,
) -> dict[str, Any]:
    return StoredUserTowerProfile(
        auth_user_uuid=auth_user_uuid,
        profile_code=profile_code,
        profile_schema_version=PROFILE_CODE_VERSION,
        survey_response_id=survey_response_id,
        survey_slug=survey_slug,
        survey_version=survey_version,
        survey_code=survey_code,
        scoring_version=scoring_version,
        share_path=build_share_path(profile_code),
        share_url=build_share_url(profile_code),
        source=source,
        updated_at=updated_at,
        raw_answers=raw_answers,
        user_profile=UserProfilePayload.model_validate(user_profile),
    ).model_dump()


async def get_catalog_response() -> CatalogResponse:
    payload = await run_in_threadpool(catalog_payload)
    payload["profile_code_prefix"] = PROFILE_CODE_PREFIX
    payload["profile_schema_version"] = PROFILE_CODE_VERSION
    return CatalogResponse.model_validate(payload)


async def resolve_prediction_response(
    session: AsyncSession,
    user_profile: dict[str, Any],
    top_k: int,
    survey_code: str = DEFAULT_SURVEY_CODE,
) -> PredictResponse:
    validated_profile = UserProfilePayload.model_validate(user_profile).model_dump()
    profile_code = encode_profile_code(validated_profile, survey_code=survey_code)
    metadata = await run_in_threadpool(evaluation_payload)
    model_signature = build_model_signature(metadata)
    cached = await prediction_cache_repository.get(
        session=session,
        profile_code=profile_code,
        model_signature=model_signature,
        top_k=top_k,
    )
    if cached is None:
        # 같은 점수 조합과 같은 모델 버전이면 이후에는 DB 캐시만으로 바로 응답할 수 있다.
        raw_prediction = await run_in_threadpool(
            predict_payload,
            user_profile=validated_profile,
            top_k=top_k,
        )
        await prediction_cache_repository.upsert(
            session=session,
            profile_code=profile_code,
            model_signature=model_signature,
            top_k=top_k,
            prediction_json=raw_prediction,
        )
        prediction_payload = raw_prediction
        await session.commit()
    else:
        prediction_payload = dict(cached.prediction_json)

    # 캐시는 순위 결과 재사용용이고, 응답의 user_profile 메타데이터는 현재 요청 기준으로 덮어쓴다.
    prediction_payload["user_profile"] = validated_profile
    prediction_payload["profile_code"] = profile_code
    prediction_payload["profile_schema_version"] = PROFILE_CODE_VERSION
    prediction_payload["survey_code"] = survey_code
    prediction_payload["share_path"] = build_share_path(profile_code)
    prediction_payload["share_url"] = build_share_url(profile_code)
    prediction_payload["model_signature"] = model_signature

    return PredictResponse.model_validate(prediction_payload)


async def get_saved_profile_response(
    session: AsyncSession,
    auth_user_uuid: str,
    top_k: int = 5,
) -> ResolvedProfileResponse:
    record = await profile_repository.get_by_auth_user_uuid(session, auth_user_uuid)
    if record is None:
        raise HTTPException(status_code=404, detail="저장된 유저 타워 프로필이 없다.")

    user_profile = {
        "user_id": record.user_id,
        "profile_name": record.profile_name,
        "preferred_category_code": record.preferred_category_code,
        "budget_level": record.budget_level,
        "stability_level": record.stability_level,
        "subway_dependency_level": record.subway_dependency_level,
        "weekend_preference_level": record.weekend_preference_level,
        "evening_preference_level": record.evening_preference_level,
        "resident_focus_level": record.resident_focus_level,
        "worker_focus_level": record.worker_focus_level,
        "rent_sensitivity_level": record.rent_sensitivity_level,
        "competition_tolerance_level": record.competition_tolerance_level,
    }
    prediction = await resolve_prediction_response(
        session=session,
        user_profile=user_profile,
        top_k=top_k,
        survey_code=record.survey_code or DEFAULT_SURVEY_CODE,
    )
    return ResolvedProfileResponse.model_validate(
        {
            "profile": _build_profile_state(
                auth_user_uuid=auth_user_uuid,
                profile_code=prediction.profile_code,
                source=record.source,
                updated_at=record.updated_at.isoformat(),
                raw_answers=record.raw_answers,
                user_profile=user_profile,
                survey_response_id=record.survey_response_id,
                survey_slug=record.survey_slug,
                survey_version=record.survey_version,
                survey_code=record.survey_code,
                scoring_version=record.scoring_version,
            ),
            "prediction": prediction.model_dump(),
        }
    )


async def upsert_saved_profile_response(
    session: AsyncSession,
    auth_user_uuid: str,
    request: SaveUserTowerProfileRequest,
) -> ResolvedProfileResponse:
    user_profile = request.user_profile.model_dump()
    profile_code = encode_profile_code(user_profile, survey_code=DEFAULT_SURVEY_CODE)
    record = await profile_repository.upsert(
        session=session,
        auth_user_uuid=auth_user_uuid,
        profile_code=profile_code,
        schema_version=PROFILE_CODE_VERSION,
        source=request.source,
        raw_answers=request.raw_answers,
        user_profile=user_profile,
    )
    prediction = await resolve_prediction_response(
        session=session,
        user_profile=user_profile,
        top_k=request.top_k,
        survey_code=DEFAULT_SURVEY_CODE,
    )
    await session.commit()
    await session.refresh(record)
    return ResolvedProfileResponse.model_validate(
        {
            "profile": _build_profile_state(
                auth_user_uuid=auth_user_uuid,
                profile_code=profile_code,
                source=record.source,
                updated_at=record.updated_at.isoformat(),
                raw_answers=record.raw_answers,
                user_profile=user_profile,
                survey_response_id=record.survey_response_id,
                survey_slug=record.survey_slug,
                survey_version=record.survey_version,
                survey_code=record.survey_code,
                scoring_version=record.scoring_version,
            ),
            "prediction": prediction.model_dump(),
        }
    )


async def resolve_shared_profile_response(
    session: AsyncSession,
    profile_code: str,
    top_k: int = 5,
) -> ResolvedProfileResponse:
    try:
        decoded = decode_profile_code_details(profile_code)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    user_profile = decoded.user_profile
    prediction = await resolve_prediction_response(
        session=session,
        user_profile=user_profile,
        top_k=top_k,
        survey_code=decoded.survey_code or DEFAULT_SURVEY_CODE,
    )
    return ResolvedProfileResponse.model_validate(
        {
            "profile": _build_profile_state(
                auth_user_uuid=None,
                profile_code=prediction.profile_code,
                source="shared_url",
                updated_at=None,
                raw_answers=None,
                user_profile=user_profile,
                survey_code=decoded.survey_code,
            ),
            "prediction": prediction.model_dump(),
        }
    )
