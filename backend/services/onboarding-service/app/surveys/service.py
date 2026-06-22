from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import SurveyDefinitionRecord, SurveyResponseRecord, UserTowerProfileRecord
from app.models.onboarding_two_tower.user_profiles import CATEGORY_OPTIONS, USER_NUMERIC_FIELDS
from app.surveys.contracts import (
    SaveSurveyResultRequest,
    SurveyAnswerValidationRequest,
    SurveyDefinitionResponse,
    SurveyDefinitionSummary,
    SurveyPreviewRequest,
    SurveyResultEnvelope,
    SurveyScoredProfile,
)
from app.surveys.definitions import active_survey_definition
from app.surveys.repository import SurveyDefinitionRepository, SurveyResponseRepository
from app.two_tower.codecs import (
    DEFAULT_SURVEY_CODE,
    PROFILE_CODE_VERSION,
    build_share_path,
    decode_profile_code_details,
)
from app.two_tower.contracts import StoredUserTowerProfile, UserProfilePayload
from app.two_tower.repository import UserTowerProfileRepository
from app.two_tower.service import build_share_url, resolve_prediction_response

# 설문 선택지의 원시 점수보다 문항 메타데이터를 더 믿도록 가중치를 둔다.
PRIMARY_EFFECT_WEIGHT = 1.0
SECONDARY_EFFECT_WEIGHT = 0.65
DEFAULT_EFFECT_WEIGHT = 0.5
NEUTRAL_USER_TOWER_SCORE = 0.5
_CATEGORY_CODES = {option["code"] for option in CATEGORY_OPTIONS}

definition_repository = SurveyDefinitionRepository()
response_repository = SurveyResponseRepository()
profile_repository = UserTowerProfileRepository()


def _build_definition_summary(record: SurveyDefinitionRecord) -> SurveyDefinitionSummary:
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


def _build_definition_summary_from_response(definition: SurveyDefinitionResponse) -> SurveyDefinitionSummary:
    return SurveyDefinitionSummary(
        id=definition.id,
        slug=definition.slug,
        version=definition.version,
        survey_code=definition.survey_code,
        scoring_version=definition.scoring_version,
        title=definition.title,
        description=definition.description,
        question_count=definition.question_count,
    )


def _build_definition_response(record: SurveyDefinitionRecord) -> SurveyDefinitionResponse:
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


def _build_profile_state(
    *,
    auth_user_uuid: str | None,
    survey: SurveyDefinitionSummary,
    source: str,
    profile_code: str,
    user_profile: dict[str, Any],
    raw_answers: dict[str, Any] | None,
    survey_response_id: int | None,
    updated_at: str | None,
    scoring_version: str,
) -> StoredUserTowerProfile:
    return StoredUserTowerProfile(
        auth_user_uuid=auth_user_uuid,
        profile_code=profile_code,
        profile_schema_version=PROFILE_CODE_VERSION,
        survey_response_id=survey_response_id,
        survey_slug=survey.slug,
        survey_version=survey.version,
        survey_code=survey.survey_code,
        scoring_version=scoring_version,
        share_path=build_share_path(profile_code),
        share_url=build_share_url(profile_code),
        source=source,
        updated_at=updated_at,
        raw_answers=raw_answers,
        user_profile=UserProfilePayload.model_validate(user_profile),
    )


def _build_definition_summary_from_any(
    definition: SurveyDefinitionRecord | SurveyDefinitionResponse,
) -> SurveyDefinitionSummary:
    if isinstance(definition, SurveyDefinitionRecord):
        return _build_definition_summary(definition)
    return _build_definition_summary_from_response(definition)


def _user_profile_from_saved_record(record: UserTowerProfileRecord) -> dict[str, Any]:
    return {
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
        # 저장 포맷을 한 가지로 유지하려고 여기서 단일/복수 선택 응답 형태를 먼저 정규화한다.
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
            if parameter_name in question_primary:
                base_weight = PRIMARY_EFFECT_WEIGHT
            elif parameter_name in question_secondary:
                base_weight = SECONDARY_EFFECT_WEIGHT
            else:
                base_weight = DEFAULT_EFFECT_WEIGHT

            # 복수선택 문항 하나가 전체 결과를 과도하게 끌고 가지 않도록 선택 수만큼 나눠 반영한다.
            applied_weight = base_weight / divisor
            score_totals[parameter_name] += float(effect_value) * applied_weight
            score_weights[parameter_name] += applied_weight


def _score_definition(
    definition: SurveyDefinitionResponse,
    request: SurveyPreviewRequest,
    *,
    question_lookup: dict[str, dict[str, Any]] | None = None,
) -> SurveyScoredProfile:
    if request.preferred_category_code not in _CATEGORY_CODES:
        raise HTTPException(status_code=422, detail="선호 업종 코드가 현재 카탈로그에 없다.")

    normalized_answers = _validate_answers(definition, request.answers)
    score_totals = {field_name: 0.0 for field_name in USER_NUMERIC_FIELDS}
    score_weights = {field_name: 0.0 for field_name in USER_NUMERIC_FIELDS}

    resolved_question_lookup = question_lookup or {
        question.id: question.model_dump()
        for question in definition.questions
    }
    for question_id, answer_value in normalized_answers.items():
        selected_codes = [answer_value] if isinstance(answer_value, str) else answer_value
        _score_question_effects(
            question=resolved_question_lookup[question_id],
            selected_codes=selected_codes,
            score_totals=score_totals,
            score_weights=score_weights,
        )

    scored_payload: dict[str, Any] = {
        "user_id": f"survey_{definition.survey_code.lower()}_preview",
        "profile_name": request.profile_name,
        "preferred_category_code": request.preferred_category_code,
    }
    for field_name in USER_NUMERIC_FIELDS:
        if score_weights[field_name] <= 0:
            scored_payload[field_name] = NEUTRAL_USER_TOWER_SCORE
        else:
            scored_payload[field_name] = round(score_totals[field_name] / score_weights[field_name], 2)

    return SurveyScoredProfile(
        survey_code=definition.survey_code,
        user_profile=UserProfilePayload.model_validate(scored_payload),
        answers=normalized_answers,
    )


def _require_survey_profile_code(profile_code: str) -> tuple[UserProfilePayload, str]:
    try:
        decoded = decode_profile_code_details(profile_code)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if decoded.survey_code in (None, DEFAULT_SURVEY_CODE):
        raise HTTPException(status_code=400, detail="설문 코드가 포함되지 않은 공유 코드다.")

    return UserProfilePayload.model_validate(decoded.user_profile), str(decoded.survey_code)


async def _get_required_definition_by_survey_code(
    session: AsyncSession,
    survey_code: str,
) -> SurveyDefinitionRecord:
    record = await definition_repository.get_by_survey_code(session, survey_code)
    if record is None:
        raise HTTPException(status_code=404, detail="해당 설문 코드를 찾지 못했다.")
    return record


def _resolve_profile_snapshot(
    *,
    response_record: SurveyResponseRecord | None,
    fallback_profile: UserProfilePayload,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    if response_record is None:
        return fallback_profile.model_dump(), None
    return dict(response_record.scored_profile_json), dict(response_record.answers_json)


def _build_survey_envelope(
    *,
    survey: SurveyDefinitionRecord | SurveyDefinitionResponse,
    auth_user_uuid: str | None,
    survey_response_id: int | None,
    source: str,
    profile_code: str,
    user_profile: dict[str, Any],
    raw_answers: dict[str, Any] | None,
    updated_at: str | None,
    prediction: Any,
) -> SurveyResultEnvelope:
    survey_summary = _build_definition_summary_from_any(survey)
    scoring_version = survey.scoring_version
    return SurveyResultEnvelope(
        survey=survey_summary,
        survey_response_id=survey_response_id,
        profile=_build_profile_state(
            auth_user_uuid=auth_user_uuid,
            survey=survey_summary,
            source=source,
            profile_code=profile_code,
            user_profile=user_profile,
            raw_answers=raw_answers,
            survey_response_id=survey_response_id,
            updated_at=updated_at,
            scoring_version=scoring_version,
        ),
        prediction=prediction,
    )


async def seed_active_survey_definition(session: AsyncSession) -> SurveyDefinitionRecord:
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
    record = await definition_repository.get_active(session)
    if record is None:
        record = await seed_active_survey_definition(session)
        await session.commit()
    return _build_definition_response(record)


async def preview_survey_result(
    session: AsyncSession,
    request: SurveyPreviewRequest,
) -> SurveyResultEnvelope:
    definition_record = await definition_repository.get_active(session)
    if definition_record is None:
        definition_record = await seed_active_survey_definition(session)
        await session.commit()

    definition = _build_definition_response(definition_record)
    scored = _score_definition(
        definition,
        request,
        question_lookup={
            str(question["id"]): dict(question)
            for question in definition_record.definition_json["questions"]
        },
    )
    prediction = await resolve_prediction_response(
        session=session,
        user_profile=scored.user_profile.model_dump(),
        top_k=request.top_k,
        survey_code=scored.survey_code,
    )

    response_record = await response_repository.create(
        session=session,
        survey_definition_id=definition.id,
        survey_slug=definition.slug,
        survey_version=definition.version,
        survey_code=definition.survey_code,
        scoring_version=definition.scoring_version,
        source="guest",
        profile_code=prediction.profile_code,
        profile_schema_version=prediction.profile_schema_version,
        profile_name=scored.user_profile.profile_name,
        preferred_category_code=scored.user_profile.preferred_category_code,
        answers_json=scored.answers,
        scored_profile_json=scored.user_profile.model_dump(),
    )
    await session.commit()
    await session.refresh(response_record)

    return _build_survey_envelope(
        survey=definition,
        auth_user_uuid=None,
        survey_response_id=response_record.id,
        source="survey",
        profile_code=prediction.profile_code,
        user_profile=scored.user_profile.model_dump(),
        raw_answers=scored.answers,
        updated_at=response_record.updated_at.isoformat(),
        prediction=prediction,
    )


async def resolve_survey_result_by_code(
    session: AsyncSession,
    profile_code: str,
    top_k: int,
) -> SurveyResultEnvelope:
    fallback_profile, survey_code = _require_survey_profile_code(profile_code)
    definition_record = await _get_required_definition_by_survey_code(session, survey_code)
    latest_response = await response_repository.get_latest_by_profile_code(session, profile_code.lower())
    user_profile, raw_answers = _resolve_profile_snapshot(
        response_record=latest_response,
        fallback_profile=fallback_profile,
    )
    prediction = await resolve_prediction_response(
        session=session,
        user_profile=user_profile,
        top_k=top_k,
        survey_code=definition_record.survey_code,
    )
    return _build_survey_envelope(
        survey=definition_record,
        auth_user_uuid=None,
        survey_response_id=latest_response.id if latest_response is not None else None,
        source="shared_url",
        profile_code=prediction.profile_code,
        user_profile=user_profile,
        raw_answers=raw_answers,
        updated_at=latest_response.updated_at.isoformat() if latest_response is not None else None,
        prediction=prediction,
    )


async def save_survey_result_for_user(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
    request: SaveSurveyResultRequest,
) -> SurveyResultEnvelope:
    fallback_profile, survey_code = _require_survey_profile_code(request.profile_code)
    definition_record = await _get_required_definition_by_survey_code(session, survey_code)

    response_record: SurveyResponseRecord | None = None
    if request.survey_response_id is not None:
        response_record = await response_repository.get_by_id(session, request.survey_response_id)
        if response_record is None:
            raise HTTPException(status_code=404, detail="설문 응답 이력을 찾지 못했다.")
        if response_record.profile_code.lower() != request.profile_code.lower():
            raise HTTPException(status_code=400, detail="설문 응답 이력과 공유 코드가 서로 다르다.")
    else:
        response_record = await response_repository.get_latest_by_profile_code(session, request.profile_code.lower())

    user_profile, raw_answers = _resolve_profile_snapshot(
        response_record=response_record,
        fallback_profile=fallback_profile,
    )
    user_profile["user_id"] = f"auth_{auth_user_uuid}"
    user_profile["profile_name"] = request.profile_name or user_profile.get("profile_name") or "내 설문 결과"
    normalized_user_profile = UserProfilePayload.model_validate(user_profile).model_dump()

    record = await profile_repository.upsert(
        session=session,
        auth_user_uuid=auth_user_uuid,
        profile_code=request.profile_code.lower(),
        schema_version=PROFILE_CODE_VERSION,
        source="survey",
        raw_answers=raw_answers,
        user_profile=normalized_user_profile,
        survey_definition_id=definition_record.id,
        survey_response_id=response_record.id if response_record is not None else None,
        survey_slug=definition_record.slug,
        survey_version=definition_record.version,
        survey_code=definition_record.survey_code,
        scoring_version=definition_record.scoring_version,
    )
    prediction = await resolve_prediction_response(
        session=session,
        user_profile=normalized_user_profile,
        top_k=request.top_k,
        survey_code=definition_record.survey_code,
    )
    await session.commit()
    await session.refresh(record)
    return _build_survey_envelope(
        survey=definition_record,
        auth_user_uuid=auth_user_uuid,
        survey_response_id=response_record.id if response_record is not None else None,
        source=record.source,
        profile_code=prediction.profile_code,
        user_profile=normalized_user_profile,
        raw_answers=record.raw_answers,
        updated_at=record.updated_at.isoformat(),
        prediction=prediction,
    )


async def get_saved_survey_result(
    session: AsyncSession,
    *,
    auth_user_uuid: str,
    top_k: int,
) -> SurveyResultEnvelope:
    record = await profile_repository.get_by_auth_user_uuid(session, auth_user_uuid)
    if record is None or record.survey_code in (None, DEFAULT_SURVEY_CODE):
        raise HTTPException(status_code=404, detail="저장된 설문 결과가 없다.")

    definition_record = await definition_repository.get_by_survey_code(session, str(record.survey_code))
    if definition_record is None:
        raise HTTPException(status_code=404, detail="저장된 설문 정의를 찾지 못했다.")

    user_profile = _user_profile_from_saved_record(record)
    prediction = await resolve_prediction_response(
        session=session,
        user_profile=user_profile,
        top_k=top_k,
        survey_code=definition_record.survey_code,
    )
    return _build_survey_envelope(
        survey=definition_record,
        auth_user_uuid=auth_user_uuid,
        survey_response_id=record.survey_response_id,
        source=record.source,
        profile_code=prediction.profile_code,
        user_profile=user_profile,
        raw_answers=record.raw_answers,
        updated_at=record.updated_at.isoformat(),
        prediction=prediction,
    )
