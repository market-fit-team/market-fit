from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.db.session import dispose_database, prepare_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    await prepare_database()
    try:
        yield
    finally:
        await dispose_database()


openapi_tags = [
    {
        "name": "system",
        "description": "서비스 상태와 기본 헬스체크 경로",
    },
    {
        "name": "survey",
        "description": "설문 정의 조회, 결과 생성, 결과 조회, 사용자 저장 경로",
    },
]

app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="사용자 설문으로 성향 결과, 업종 추천, 업종별 상권 추천을 제공하는 서비스.",
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
