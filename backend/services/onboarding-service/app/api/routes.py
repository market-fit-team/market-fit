from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_auth_user, get_db_session, get_optional_auth_user
from app.core.config import settings
from app.core.jwt_auth import AuthUserContext
from app.models.onboarding_category_tower.runtime import (
    evaluation_payload as category_evaluation_payload,
)
from app.models.onboarding_two_tower.runtime import (
    evaluation_payload as area_evaluation_payload,
)
from app.surveys.contracts import (
    SaveSurveyProfileRequest,
    SaveSurveyResultRequest,
    SavedSurveyResultListResponse,
    SavedSurveyResultSummary,
    SurveyAreaRecommendationResponse,
    SurveyDefinitionResponse,
    SurveyPreviewRequest,
    SurveyProfileStatusResponse,
    SurveyResultResponse,
)
from app.surveys.service import (
    delete_saved_survey_result_for_user,
    get_active_survey_definition,
    get_area_recommendations_by_result_code,
    get_default_profile_status,
    get_default_survey_result,
    get_survey_result_by_code,
    list_saved_survey_results,
    preview_survey_result,
    save_survey_result_for_user,
    set_default_survey_result_for_user,
)

router = APIRouter()


@router.get(
    "/health",
    tags=["system"],
    summary="서비스 상태 조회",
    description="업종 추천 모델과 상권 추천 모델의 기본 적재 상태를 반환한다.",
)
async def health() -> dict[str, Any]:
    area_evaluation, category_evaluation = await run_in_threadpool(
        lambda: (area_evaluation_payload(), category_evaluation_payload())
    )
    return {
        "ok": True,
        "service": settings.service_name,
        "version": settings.service_version,
        "area_model": {
            "model_id": area_evaluation["model_id"],
            "trained_at": area_evaluation["trained_at"],
            "item_count": area_evaluation["item_count"],
        },
        "category_model": {
            "model_id": category_evaluation["model_id"],
            "trained_at": category_evaluation["trained_at"],
            "category_count": category_evaluation["category_count"],
        },
    }


@router.get(
    "/surveys/active",
    response_model=SurveyDefinitionResponse,
    tags=["survey"],
    summary="현재 활성 설문 정의 조회",
    description="프론트 설문 페이지가 렌더링할 문항, 선택지, 점수화 버전 정보를 반환한다.",
)
async def get_active_survey(
    session: AsyncSession = Depends(get_db_session),
) -> SurveyDefinitionResponse:
    return await get_active_survey_definition(session)


@router.post(
    "/surveys/active/preview",
    response_model=SurveyResultResponse,
    tags=["survey"],
    summary="설문 응답 결과 생성",
    description="설문 답변으로 상권용 9축과 업종용 17축을 계산하고 결과 본체를 저장한다.",
)
async def preview_active_survey(
    request: SurveyPreviewRequest,
    auth_user: AuthUserContext | None = Depends(get_optional_auth_user),
    session: AsyncSession = Depends(get_db_session),
) -> SurveyResultResponse:
    return await preview_survey_result(
        session,
        request,
        auth_user_uuid=auth_user.auth_user_uuid if auth_user else None,
    )


@router.get(
    "/surveys/results/{result_code}",
    response_model=SurveyResultResponse,
    tags=["survey"],
    summary="설문 결과 본체 조회",
    description="공개 결과 코드로 저장된 성향 결과, 유저타워, 업종 추천을 조회한다.",
)
async def get_result_by_code(
    result_code: str,
    session: AsyncSession = Depends(get_db_session),
) -> SurveyResultResponse:
    return await get_survey_result_by_code(session, result_code)


@router.get(
    "/surveys/results/{result_code}/area-recommendations",
    response_model=SurveyAreaRecommendationResponse,
    tags=["survey"],
    summary="업종별 상권 추천 조회",
    description="결과 코드와 업종 코드를 함께 받아 상권 추천을 조회한다.",
)
async def get_area_recommendations(
    result_code: str,
    category_code: str = Query(description="조회할 업종 코드"),
    top_k: int = Query(default=5, ge=1, le=10, description="반환할 상권 추천 개수"),
    session: AsyncSession = Depends(get_db_session),
) -> SurveyAreaRecommendationResponse:
    return await get_area_recommendations_by_result_code(
        session,
        result_code=result_code,
        selected_category_code=category_code,
        top_k=top_k,
    )


@router.get(
    "/surveys/me/profile/status",
    response_model=SurveyProfileStatusResponse,
    tags=["survey"],
    summary="기본 성향 프로필 존재 여부 조회",
    description="로그인 사용자의 기본 성향 프로필이 있는지만 빠르게 확인한다.",
)
async def get_my_profile_status(
    auth_user: AuthUserContext = Depends(get_current_auth_user),
    session: AsyncSession = Depends(get_db_session),
) -> SurveyProfileStatusResponse:
    return await get_default_profile_status(
        session=session,
        auth_user_uuid=auth_user.auth_user_uuid,
    )


@router.put(
    "/surveys/me/profile",
    response_model=SurveyResultResponse,
    tags=["survey"],
    summary="기본 성향 프로필 저장 또는 교체",
    description="로그인 사용자의 기본 성향 프로필을 결과 코드 기준으로 저장한다.",
)
async def put_my_survey_profile(
    request: SaveSurveyProfileRequest,
    auth_user: AuthUserContext = Depends(get_current_auth_user),
    session: AsyncSession = Depends(get_db_session),
) -> SurveyResultResponse:
    return await set_default_survey_result_for_user(
        session=session,
        auth_user_uuid=auth_user.auth_user_uuid,
        request=request,
    )


@router.get(
    "/surveys/me/profile",
    response_model=SurveyResultResponse,
    tags=["survey"],
    summary="내 기본 성향 프로필 조회",
    description="로그인 사용자의 기본 성향 프로필 본체를 조회한다.",
)
async def get_my_survey_profile(
    auth_user: AuthUserContext = Depends(get_current_auth_user),
    session: AsyncSession = Depends(get_db_session),
) -> SurveyResultResponse:
    return await get_default_survey_result(
        session=session,
        auth_user_uuid=auth_user.auth_user_uuid,
    )


@router.post(
    "/surveys/me/saved-results",
    response_model=SavedSurveyResultSummary,
    tags=["survey"],
    summary="설문 결과 저장",
    description="로그인 사용자가 특정 결과 코드를 저장 목록에 추가한다.",
)
async def post_saved_survey_result(
    request: SaveSurveyResultRequest,
    auth_user: AuthUserContext = Depends(get_current_auth_user),
    session: AsyncSession = Depends(get_db_session),
) -> SavedSurveyResultSummary:
    return await save_survey_result_for_user(
        session=session,
        auth_user_uuid=auth_user.auth_user_uuid,
        request=request,
    )


@router.get(
    "/surveys/me/saved-results",
    response_model=SavedSurveyResultListResponse,
    tags=["survey"],
    summary="저장한 설문 결과 목록 조회",
    description="로그인 사용자의 과거 설문 결과와 수동 저장 결과 목록을 반환한다.",
)
async def get_saved_survey_results(
    auth_user: AuthUserContext = Depends(get_current_auth_user),
    session: AsyncSession = Depends(get_db_session),
) -> SavedSurveyResultListResponse:
    return await list_saved_survey_results(
        session=session,
        auth_user_uuid=auth_user.auth_user_uuid,
    )


@router.delete(
    "/surveys/me/saved-results/{result_code}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["survey"],
    summary="저장한 설문 결과 삭제",
    description="로그인 사용자의 저장 목록에서 특정 결과를 제거한다.",
)
async def delete_saved_survey_result(
    result_code: str,
    auth_user: AuthUserContext = Depends(get_current_auth_user),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    await delete_saved_survey_result_for_user(
        session=session,
        auth_user_uuid=auth_user.auth_user_uuid,
        result_code=result_code,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
