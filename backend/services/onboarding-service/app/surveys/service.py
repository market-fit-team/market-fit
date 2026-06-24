from __future__ import annotations

import hashlib
import json
from typing import Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.models.onboarding_category_tower.contracts import (
    CategoryRecommendation,
    CategoryUserProfilePayload,
)
from app.models.onboarding_category_tower.runtime import (
    evaluation_payload as category_evaluation_payload,
)
from app.models.onboarding_category_tower.runtime import (
    predict_payload as category_predict_payload,
)
from app.models.onboarding_category_tower.user_profiles import (
    USER_NUMERIC_FIELDS as CATEGORY_USER_NUMERIC_FIELDS,
)
from app.models.onboarding_two_tower.user_profiles import CATEGORY_OPTIONS
from app.models.onboarding_two_tower.user_profiles import (
    USER_NUMERIC_FIELDS as AREA_USER_NUMERIC_FIELDS,
)
from app.surveys.contracts import (
    SaveSurveyProfileRequest,
    SaveSurveyResultRequest,
    SavedSurveyResultListResponse,
    SavedSurveyResultSummary,
    SurveyAnswerValidationRequest,
    SurveyAreaRecommendationResponse,
    SurveyDefinitionResponse,
    SurveyDefinitionSummary,
    SurveyPreviewRequest,
    SurveyProfileStatusResponse,
    SurveyResultResponse,
    SurveyScoredProfiles,
)
from app.surveys.definitions import active_survey_definition
from app.surveys.repository import (
    CategoryPredictionCacheRepository,
    SurveyDefinitionRepository,
    SurveyResultRepository,
    UserDefaultProfileRepository,
    UserSavedResultRepository,
)
from app.two_tower.codecs import (
    InvalidResultCodeError,
    build_share_path,
    generate_result_code,
    normalize_result_code,
)
from app.two_tower.contracts import AreaUserProfilePayload, PredictResponse, UserProfilePayload
from app.two_tower.service import build_share_url, resolve_area_prediction

PRIMARY_EFFECT_WEIGHT = 1.0
SECONDARY_EFFECT_WEIGHT = 0.65
DEFAULT_EFFECT_WEIGHT = 0.5
NEUTRAL_USER_TOWER_SCORE = 0.5
DEFAULT_CATEGORY_TOP_K = 20
DEFAULT_AREA_TOP_K = 5
CATEGORY_RECOMMENDATION_SCORE_SCALE = "category_sigmoid_zero_to_one_v1"
AGE_FIELD_NAMES = [
    "target_age_10_level",
    "target_age_20_level",
    "target_age_30_level",
    "target_age_40_level",
    "target_age_50_plus_level",
]
_CATEGORY_CODES = {option["code"] for option in CATEGORY_OPTIONS}

definition_repository = SurveyDefinitionRepository()
result_repository = SurveyResultRepository()
category_prediction_cache_repository = CategoryPredictionCacheRepository()
default_profile_repository = UserDefaultProfileRepository()
saved_result_repository = UserSavedResultRepository()


def _build_definition_summary(record: Any) -> SurveyDefinitionSummary:
    return SurveyDefinitionSummary(
        id=record.id,
        slug=record.slug,
        version=record.version,
        survey_code=record.survey_code,
        scoring_version=record.scoring_version,
        title=record.title,
        description=record.description,
        question_count=record.question_count,
    )


def _build_definition_response(record: Any) -> SurveyDefinitionResponse:
    definition_json = dict(record.definition_json)
    return SurveyDefinitionResponse.model_validate(
        {
            "id": record.id,
            "slug": record.slug,
            "version": record.version,
            "survey_code": record.survey_code,
            "scoring_version": record.scoring_version,
            "title": record.title,
            "description": record.description,
            "question_count": record.question_count,
            "questions": definition_json["questions"],
        }
    )


def _find_option(question: dict[str, Any], option_code: str) -> dict[str, Any]:
    for option in question["options"]:
        if option["code"] == option_code:
            return option
    raise HTTPException(status_code=422, detail=f"{question['id']} 응답 코드가 정의에 없다.")


def _validate_answers(definition: SurveyDefinitionResponse, answers: dict[str, Any]) -> dict[str, Any]:
    normalized_answers: dict[str, Any] = {}
    question_ids = {question.id for question in definition.questions}
    extra_question_ids = sorted(set(answers) - question_ids)
    if extra_question_ids:
        raise HTTPException(status_code=422, detail=f"정의되지 않은 문항 응답이 있다: {', '.join(extra_question_ids)}")

    for question in definition.questions:
        if question.id not in answers:
            raise HTTPException(status_code=422, detail=f"{question.id} 응답이 비어 있다.")

        answer = answers[question.id]
        SurveyAnswerValidationRequest(question=question, answer=answer)
        valid_codes = {option.code for option in question.options}

        if question.selection_type == "single":
            normalized_code = str(answer).strip().upper()
            if normalized_code not in valid_codes:
                raise HTTPException(status_code=422, detail=f"{question.id} 응답 코드가 올바르지 않다.")
            normalized_answers[question.id] = normalized_code
            continue

        normalized_codes: list[str] = []
        for raw_value in answer:
            normalized_code = str(raw_value).strip().upper()
            if normalized_code not in valid_codes:
                raise HTTPException(status_code=422, detail=f"{question.id} 응답 코드가 올바르지 않다.")
            if normalized_code not in normalized_codes:
                normalized_codes.append(normalized_code)

        if not normalized_codes:
            raise HTTPException(status_code=422, detail=f"{question.id} 응답이 비어 있다.")
        normalized_answers[question.id] = normalized_codes

    return normalized_answers


def _score_question_effects(
    *,
    question: dict[str, Any],
    selected_codes: list[str],
    score_totals: dict[str, float],
    score_weights: dict[str, float],
) -> None:
    question_primary = set(question.get("primary_parameters", []))
    question_secondary = set(question.get("secondary_parameters", []))
    divisor = max(len(selected_codes), 1)

    for selected_code in selected_codes:
        option = _find_option(question, selected_code)
        for parameter_name, effect_value in option.get("effects", {}).items():
            if parameter_name not in score_totals:
                continue
            if parameter_name in question_primary:
                base_weight = PRIMARY_EFFECT_WEIGHT
            elif parameter_name in question_secondary:
                base_weight = SECONDARY_EFFECT_WEIGHT
            else:
                base_weight = DEFAULT_EFFECT_WEIGHT

            applied_weight = base_weight / divisor
            score_totals[parameter_name] += float(effect_value) * applied_weight
            score_weights[parameter_name] += applied_weight


def _normalize_age_distribution(payload: dict[str, Any]) -> dict[str, Any]:
    total = sum(float(payload[field_name]) for field_name in AGE_FIELD_NAMES)
    if total <= 0:
        for field_name in AGE_FIELD_NAMES:
            payload[field_name] = round(1 / len(AGE_FIELD_NAMES), 2)
        return payload

    normalized_values: list[float] = []
    for field_name in AGE_FIELD_NAMES[:-1]:
        normalized_values.append(round(float(payload[field_name]) / total, 2))
    normalized_values.append(round(1.0 - sum(normalized_values), 2))

    for field_name, normalized_value in zip(AGE_FIELD_NAMES, normalized_values, strict=True):
        payload[field_name] = normalized_value
    return payload


def _score_definition(
    definition: SurveyDefinitionResponse,
    request: SurveyPreviewRequest,
    *,
    question_lookup: dict[str, dict[str, Any]] | None = None,
) -> SurveyScoredProfiles:
    normalized_answers = _validate_answers(definition, request.answers)

    area_score_totals = {field_name: 0.0 for field_name in AREA_USER_NUMERIC_FIELDS}
    area_score_weights = {field_name: 0.0 for field_name in AREA_USER_NUMERIC_FIELDS}
    category_score_totals = {field_name: 0.0 for field_name in CATEGORY_USER_NUMERIC_FIELDS}
    category_score_weights = {field_name: 0.0 for field_name in CATEGORY_USER_NUMERIC_FIELDS}

    resolved_question_lookup = question_lookup or {
        question.id: question.model_dump()
        for question in definition.questions
    }
    for question_id, answer_value in normalized_answers.items():
        selected_codes = [answer_value] if isinstance(answer_value, str) else answer_value
        _score_question_effects(
            question=resolved_question_lookup[question_id],
            selected_codes=selected_codes,
            score_totals=area_score_totals,
            score_weights=area_score_weights,
        )
        _score_question_effects(
            question=resolved_question_lookup[question_id],
            selected_codes=selected_codes,
            score_totals=category_score_totals,
            score_weights=category_score_weights,
        )

    area_payload: dict[str, Any] = {
        "user_id": f"survey_{definition.survey_code.lower()}_area",
        "profile_name": request.profile_name,
    }
    for field_name in AREA_USER_NUMERIC_FIELDS:
        if area_score_weights[field_name] <= 0:
            area_payload[field_name] = NEUTRAL_USER_TOWER_SCORE
        else:
            area_payload[field_name] = round(area_score_totals[field_name] / area_score_weights[field_name], 2)

    category_payload: dict[str, Any] = {
        "user_id": f"survey_{definition.survey_code.lower()}_category",
        "profile_name": request.profile_name,
    }
    for field_name in CATEGORY_USER_NUMERIC_FIELDS:
        if field_name in AGE_FIELD_NAMES:
            category_payload[field_name] = (
                round(category_score_totals[field_name] / category_score_weights[field_name], 2)
                if category_score_weights[field_name] > 0
                else 0.0
            )
            continue

        if category_score_weights[field_name] <= 0:
            category_payload[field_name] = NEUTRAL_USER_TOWER_SCORE
        else:
            category_payload[field_name] = round(
                category_score_totals[field_name] / category_score_weights[field_name],
                2,
            )
    category_payload = _normalize_age_distribution(category_payload)

    return SurveyScoredProfiles(
        survey_code=definition.survey_code,
        answers=normalized_answers,
        area_user_profile=AreaUserProfilePayload.model_validate(area_payload),
        category_user_profile=CategoryUserProfilePayload.model_validate(category_payload),
    )


def _build_answers_hash(
    *,
    survey_code: str,
    scoring_version: str,
    answers: dict[str, Any],
) -> str:
    payload = {
        "survey_code": survey_code,
        "scoring_version": scoring_version,
        "answers": answers,
    }
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _build_area_profile_key(
    *,
    survey_code: str,
    scoring_version: str,
    area_user_profile: AreaUserProfilePayload,
) -> str:
    payload = {
        "survey_code": survey_code,
        "scoring_version": scoring_version,
        "scores": {
            field_name: getattr(area_user_profile, field_name)
            for field_name in AREA_USER_NUMERIC_FIELDS
        },
    }
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _build_category_profile_key(
    *,
    survey_code: str,
    scoring_version: str,
    category_user_profile: CategoryUserProfilePayload,
) -> str:
    payload = {
        "survey_code": survey_code,
        "scoring_version": scoring_version,
        "scores": {
            field_name: getattr(category_user_profile, field_name)
            for field_name in CATEGORY_USER_NUMERIC_FIELDS
        },
    }
    serialized = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _build_category_model_signature(metadata: dict[str, Any]) -> str:
    return f"{metadata['model_id']}:{metadata['trained_at']}:{CATEGORY_RECOMMENDATION_SCORE_SCALE}"


def _build_result_response(*, survey: Any, record: Any) -> SurveyResultResponse:
    category_prediction = dict(record.category_recommendations_json)
    return SurveyResultResponse(
        survey=_build_definition_summary(survey),
        result_code=record.result_code,
        profile_name=record.profile_name,
        share_path=build_share_path(record.result_code),
        share_url=build_share_url(record.result_code),
        area_user_profile=AreaUserProfilePayload.model_validate(record.area_user_profile_json),
        category_user_profile=CategoryUserProfilePayload.model_validate(record.category_user_profile_json),
        category_recommendations=[
            CategoryRecommendation.model_validate(row)
            for row in category_prediction["recommendations"]
        ],
        created_at=record.created_at,
    )


def _build_saved_result_summary(*, saved_record: Any, result_record: Any) -> SavedSurveyResultSummary:
    return SavedSurveyResultSummary(
        result_code=result_record.result_code,
        profile_name=result_record.profile_name,
        share_path=build_share_path(result_record.result_code),
        share_url=build_share_url(result_record.result_code),
        saved_source=saved_record.saved_source,
        saved_label=saved_record.saved_label,
        result_created_at=result_record.created_at,
        saved_at=saved_record.updated_at,
    )


async def _get_active_definition_record(session: AsyncSession) -> Any:
    record = await definition_repository.get_active(session)
    if record is None:
        record = await seed_active_survey_definition(session)
        await session.commit()
    return record


async def _resolve_result_record_by_code(session: AsyncSession, result_code: str) -> Any:
    try:
        normalized_result_code = normalize_result_code(result_code)
    except InvalidResultCodeError as error:
        raise HTTPException(status_code=404, detail="해당 결과 코드를 찾지 못했다.") from error

    record = await result_repository.get_by_result_code(session, normalized_result_code)
    if record is None:
        raise HTTPException(status_code=404, detail="해당 결과 코드를 찾지 못했다.")
    return record


async def seed_active_survey_definition(session: AsyncSession) -> Any:
    definition_json = active_survey_definition()
    return await definition_repository.upsert_active_definition(
        session=session,
        slug=str(definition_json["slug"]),
        version=int(definition_json["version"]),
        survey_code=str(definition_json["survey_code"]),
        scoring_version=str(definition_json["scoring_version"]),
        title=str(definition_json["title"]),
        description=str(definition_json["description"]),
        question_count=len(definition_json["questions"]),
        definition_json=definition_json,
    )


async def get_active_survey_definition(session: AsyncSession) -> SurveyDefinitionResponse:
    record = await _get_active_definition_record(session)
    return _build_definition_response(record)


async def preview_survey_result(
    session: AsyncSession,
    request: SurveyPreviewRequest,
    *,
    auth_user_uuid: str | None = None,
) -> SurveyResultResponse:
    definition_record = await _get_active_definition_record(session)
    definition = _build_definition_response(definition_record)
    scored = _score_definition(
        definition,
        request,
        question_lookup={
            str(question["id"]): dict(question)
            for question in definition_record.definition_json["questions"]
        },
    )
    answers_hash = _build_answers_hash(
        survey_code=definition.survey_code,
        scoring_version=definition.scoring_version,
        answers=scored.answers,
    )
    area_profile_key = _build_area_profile_key(
        survey_code=definition.survey_code,
        scoring_version=definition.scoring_version,
        area_user_profile=scored.area_user_profile,
    )
    category_profile_key = _build_category_profile_key(
        survey_code=definition.survey_code,
        scoring_version=definition.scoring_version,
        category_user_profile=scored.category_user_profile,
    )

    category_metadata = await run_in_threadpool(category_evaluation_payload)
    category_model_signature = _build_category_model_signature(category_metadata)
    cached = await category_prediction_cache_repository.get(
        session=session,
        category_profile_key=category_profile_key,
        model_signature=category_model_signature,
        top_k=DEFAULT_CATEGORY_TOP_K,
    )
    if cached is None:
        category_prediction_payload = await run_in_threadpool(
            category_predict_payload,
            user_profile=scored.category_user_profile.model_dump(),
            top_k=DEFAULT_CATEGORY_TOP_K,
        )
        await category_prediction_cache_repository.upsert(
            session=session,
            category_profile_key=category_profile_key,
            model_signature=category_model_signature,
            top_k=DEFAULT_CATEGORY_TOP_K,
            prediction_json=category_prediction_payload,
        )
    else:
        category_prediction_payload = dict(cached.prediction_json)

    result_code: str | None = None
    for _ in range(10):
        candidate = generate_result_code()
        if await result_repository.get_by_result_code(session, candidate) is None:
            result_code = candidate
            break
    if result_code is None:
        raise HTTPException(status_code=500, detail="결과 코드를 생성하지 못했다.")

    result_record = await result_repository.create(
        session=session,
        result_code=result_code,
        survey_definition_id=definition.id,
        source="authenticated" if auth_user_uuid else "guest",
        profile_name=request.profile_name,
        answers_json=scored.answers,
        answers_hash=answers_hash,
        area_user_profile_json=scored.area_user_profile.model_dump(),
        category_user_profile_json=scored.category_user_profile.model_dump(),
        area_profile_key=area_profile_key,
        category_profile_key=category_profile_key,
        category_recommendations_json=category_prediction_payload,
    )
    if auth_user_uuid is not None:
        await saved_result_repository.upsert(
            session=session,
            auth_user_uuid=auth_user_uuid,
            survey_result_id=result_record.id,
            saved_source="survey_submit",
        )

    await session.commit()
    return _build_result_response(survey=definition_record, record=result_record)


async def get_survey_result_by_code(
    session: AsyncSession,
    result_code: str,
) -> SurveyResultResponse:
    result_record = await _resolve_result_record_by_code(session, result_code)
    definition_record = await definition_repository.get_by_id(session, result_record.survey_definition_id)
    if definition_record is None:
        raise HTTPException(status_code=404, detail="설문 정의를 찾지 못했다.")
    return _build_result_response(survey=definition_record, record=result_record)


async def get_area_recommendations_by_result_code(
    session: AsyncSession,
    *,
    result_code: str,
    selected_category_code: str,
    top_k: int = DEFAULT_AREA_TOP_K,
) -> SurveyAreaRecommendationResponse:
    if selected_category_code not in _CATEGORY_CODES:
        raise HTTPException(status_code=422, detail="선택한 업종 코드가 현재 카탈로그에 없다.")

    result_record = await _resolve_result_record_by_code(session, result_code)
    area_profile_payload = dict(result_record.area_user_profile_json)
    area_profile_payload["preferred_category_code"] = selected_category_code
    prediction = await resolve_area_prediction(
        session=session,
        area_profile_key=result_record.area_profile_key,
        user_profile=area_profile_payload,
        selected_category_code=selected_category_code,
        top_k=top_k,
    )
    await session.commit()
    return SurveyAreaRecommendationResponse(
        result_code=result_record.result_code,
        selected_category_code=selected_category_code,
        share_path=build_share_path(result_record.result_code),
        share_url=build_share_url(result_record.result_code),
        prediction=prediction,
    )


async def set_default_survey_result_for_user(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
    request: SaveSurveyProfileRequest,
) -> SurveyResultResponse:
    result_record = await _resolve_result_record_by_code(session, request.result_code)
    await default_profile_repository.upsert(
        session=session,
        auth_user_uuid=auth_user_uuid,
        survey_result_id=result_record.id,
    )
    await saved_result_repository.upsert(
        session=session,
        auth_user_uuid=auth_user_uuid,
        survey_result_id=result_record.id,
        saved_source="default_profile",
    )
    definition_record = await definition_repository.get_by_id(session, result_record.survey_definition_id)
    if definition_record is None:
        raise HTTPException(status_code=404, detail="설문 정의를 찾지 못했다.")
    await session.commit()
    return _build_result_response(survey=definition_record, record=result_record)


async def get_default_survey_result(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
) -> SurveyResultResponse:
    default_record = await default_profile_repository.get_by_auth_user_uuid(session, auth_user_uuid)
    if default_record is None:
        raise HTTPException(status_code=404, detail="기본 성향 프로필이 없다.")

    result_record = await result_repository.get_by_id(session, default_record.survey_result_id)
    if result_record is None:
        raise HTTPException(status_code=404, detail="기본 성향 결과를 찾지 못했다.")

    definition_record = await definition_repository.get_by_id(session, result_record.survey_definition_id)
    if definition_record is None:
        raise HTTPException(status_code=404, detail="설문 정의를 찾지 못했다.")
    return _build_result_response(survey=definition_record, record=result_record)


async def get_default_profile_status(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
) -> SurveyProfileStatusResponse:
    default_record = await default_profile_repository.get_by_auth_user_uuid(session, auth_user_uuid)
    if default_record is None:
        return SurveyProfileStatusResponse(has_default_profile=False, default_result_code=None)

    result_record = await result_repository.get_by_id(session, default_record.survey_result_id)
    if result_record is None:
        return SurveyProfileStatusResponse(has_default_profile=False, default_result_code=None)

    return SurveyProfileStatusResponse(
        has_default_profile=True,
        default_result_code=result_record.result_code,
    )


async def save_survey_result_for_user(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
    request: SaveSurveyResultRequest,
) -> SavedSurveyResultSummary:
    result_record = await _resolve_result_record_by_code(session, request.result_code)
    saved_record = await saved_result_repository.upsert(
        session=session,
        auth_user_uuid=auth_user_uuid,
        survey_result_id=result_record.id,
        saved_source="manual_save",
        saved_label=request.saved_label,
    )
    await session.commit()
    return _build_saved_result_summary(saved_record=saved_record, result_record=result_record)


async def list_saved_survey_results(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
) -> SavedSurveyResultListResponse:
    saved_records = await saved_result_repository.get_by_auth_user_uuid(session, auth_user_uuid)
    default_record = await default_profile_repository.get_by_auth_user_uuid(session, auth_user_uuid)
    result_records = await result_repository.get_by_ids(
        session,
        [record.survey_result_id for record in saved_records],
    )
    result_record_by_id = {record.id: record for record in result_records}

    summaries: list[SavedSurveyResultSummary] = []
    for saved_record in saved_records:
        result_record = result_record_by_id.get(saved_record.survey_result_id)
        if result_record is None:
            continue
        summaries.append(
            _build_saved_result_summary(saved_record=saved_record, result_record=result_record)
        )

    default_result_code: str | None = None
    if default_record is not None:
        default_result_record = result_record_by_id.get(default_record.survey_result_id)
        if default_result_record is None:
            default_result_record = await result_repository.get_by_id(session, default_record.survey_result_id)
        if default_result_record is not None:
            default_result_code = default_result_record.result_code

    return SavedSurveyResultListResponse(
        default_result_code=default_result_code,
        results=summaries,
    )


async def delete_saved_survey_result_for_user(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
    result_code: str,
) -> None:
    result_record = await _resolve_result_record_by_code(session, result_code)
    deleted = await saved_result_repository.delete_one(
        session=session,
        auth_user_uuid=auth_user_uuid,
        survey_result_id=result_record.id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="저장된 설문 결과가 없다.")
    await session.commit()
