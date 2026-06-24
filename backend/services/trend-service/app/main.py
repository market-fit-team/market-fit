from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from app.api.routes import router
from app.core.config import settings
from app.models.commercial_trend.runtime import ensure_model


def _bootstrap() -> None:
    # db 모드면 테이블 생성 + 행정동 이름 부트스트랩 후 학습한다.
    if settings.data_mode == "db":
        from app.db.session import prepare_database

        prepare_database()
    if settings.bootstrap_train_if_missing:
        ensure_model(settings.data_mode)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await run_in_threadpool(_bootstrap)
    try:
        yield
    finally:
        if settings.data_mode == "db":
            from app.db.session import dispose_database

            dispose_database()


openapi_tags = [
    {"name": "system", "description": "서비스 상태와 헬스체크 경로"},
    {"name": "trend", "description": "상권 트렌드 점수 배너 경로"},
]

app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="생활인구 흐름을 학습해 상권 트렌드 점수를 예측하고 배너 데이터를 제공하는 서비스.",
    lifespan=lifespan,
    openapi_tags=openapi_tags,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, settings.frontend_origin_alt],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
