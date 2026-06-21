from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.core.config import settings
from app.models.onboarding_two_tower.contract import (
    CatalogResponse,
    EvaluationResponse,
    PredictRequest,
    PredictResponse,
    TrainRequest,
)
from app.models.onboarding_two_tower.runtime import (
    catalog_payload,
    evaluation_payload,
    predict_payload,
    train_runtime,
)

router = APIRouter()


@router.get(
    "/health",
    tags=["system"],
    summary="서비스 상태 조회",
    description="현재 로드된 온보딩 투타워 모델의 기본 상태를 반환한다.",
)
def health() -> dict[str, Any]:
    evaluation = evaluation_payload()
    return {
        "ok": True,
        "service": settings.service_name,
        "version": settings.service_version,
        "model_id": settings.model_id,
        "trained_at": evaluation["trained_at"],
        "item_count": evaluation["item_count"],
    }


@router.get(
    "/two-tower/catalog",
    response_model=CatalogResponse,
    tags=["two-tower"],
    summary="투타워 카탈로그 조회",
    description="예제 화면 초기 렌더링에 필요한 유저 컨트롤, 샘플 프로필, 아이템 미리보기를 반환한다.",
)
def two_tower_catalog() -> CatalogResponse:
    return CatalogResponse.model_validate(catalog_payload())


@router.get(
    "/two-tower/evaluation",
    response_model=EvaluationResponse,
    tags=["two-tower"],
    summary="투타워 학습 지표 조회",
    description="현재 artifact 기준의 학습 시간, 손실값, retrieval 지표를 반환한다.",
)
def two_tower_evaluation() -> EvaluationResponse:
    return EvaluationResponse.model_validate(evaluation_payload())


@router.post(
    "/two-tower/train",
    response_model=EvaluationResponse,
    tags=["two-tower"],
    summary="투타워 모델 재학습",
    description="샘플 프로필과 샘플 아이템 카탈로그를 사용해 온보딩 투타워 모델을 다시 학습한다.",
)
def train_two_tower(request: TrainRequest) -> EvaluationResponse:
    return EvaluationResponse.model_validate(train_runtime(request.epochs))


@router.post(
    "/two-tower/predict",
    response_model=PredictResponse,
    tags=["two-tower"],
    summary="투타워 추천 계산",
    description="프론트에서 조정한 유저 타워 입력값으로 행정동-업종 후보를 다시 정렬한다.",
)
def predict_two_tower(request: PredictRequest) -> PredictResponse:
    return PredictResponse.model_validate(
        predict_payload(
            user_profile=request.user_profile.model_dump(),
            top_k=request.top_k,
        )
    )
