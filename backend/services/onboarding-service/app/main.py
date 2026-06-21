from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings

app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="사용자 온보딩 과정에서 투타워 추천 결과를 제공하는 서비스.",
    openapi_tags=[
        {
            "name": "system",
            "description": "서비스 상태와 기본 헬스체크 경로",
        },
        {
            "name": "two-tower",
            "description": "온보딩 투타워 학습, 카탈로그 조회, 추천 계산 경로",
        },
    ],
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, settings.frontend_origin_alt],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
