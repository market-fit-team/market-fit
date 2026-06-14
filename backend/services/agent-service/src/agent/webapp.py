from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, HTTPException, Security, status
from fastapi.exceptions import RequestValidationError
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.exceptions import HTTPException as StarletteHTTPException

from agent.core.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
    server_error_exception_handler,
)
from agent.schemas.chat import ListChatModelsResponse, ListChatToolsResponse
from agent.services.chat.model_catalog import ChatModelCatalogError, list_chat_models
from agent.services.chat.toolkits.chat_toolkit import list_chat_tools

app = FastAPI(title="Pickle Agent Custom Routes")

# NOTE:
# LangGraph custom auth(src/agent/security/auth.py)가 실제 JWT 검증을 담당합니다.
# 여기의 HTTPBearer는 /docs 와 /openapi.json 에 "Bearer JWT" 인증 방식을 문서화해서
# Swagger UI Authorize 버튼으로 토큰을 넣고 custom route를 테스트할 수 있게 하기 위한 용도입니다.
# auto_error=False 로 두어 FastAPI 쪽에서 별도의 인증 실패 응답을 만들지 않게 합니다.
bearer_auth = HTTPBearer(
    bearerFormat="JWT",
    scheme_name="bearerAuth",
    description="authentik access token을 Authorization: Bearer <token> 헤더로 전달합니다.",
    auto_error=False,
)

DocumentedBearerAuth = Annotated[
    HTTPAuthorizationCredentials | None,
    Security(bearer_auth),
]

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(Exception, server_error_exception_handler)


@app.get("/api/v1/llm/tools", response_model=ListChatToolsResponse, tags=["llm"])
async def list_llm_tools(
    _: DocumentedBearerAuth,
) -> ListChatToolsResponse:
    """Return tool metadata used by the frontend HITL/tool-policy UI."""

    return ListChatToolsResponse(tools=list_chat_tools())


@app.get("/api/v1/llm/models", response_model=ListChatModelsResponse, tags=["llm"])
async def list_llm_models(
    _: DocumentedBearerAuth,
) -> ListChatModelsResponse:
    """Return selectable chat model metadata.

    Streaming/chat execution itself still uses the native Agent Server
    threads/runs API. This custom route only replaces the old FastAPI catalog
    endpoint so the existing UI can be copied with minimal changes.
    """

    try:
        return await list_chat_models()
    except ChatModelCatalogError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="failed to fetch chat models",
        ) from None
