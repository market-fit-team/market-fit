from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from agent.api.deps import CurrentApiUser
from agent.api.routes.workspace import router as workspace_router
from agent.core.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
    server_error_exception_handler,
)
from agent.db.session import dispose_database, prepare_database
from agent.schemas.chat import ListChatModelsResponse, ListChatToolsResponse
from agent.services.chat.model_catalog import ChatModelCatalogError, list_chat_models
from agent.services.chat.toolkits.chat_toolkit import list_chat_tools

@asynccontextmanager
async def lifespan(_: FastAPI):
    await prepare_database()
    yield
    await dispose_database()


app = FastAPI(title="Pickle Agent Custom Routes", lifespan=lifespan)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, request_validation_exception_handler)
app.add_exception_handler(Exception, server_error_exception_handler)


@app.get("/api/v1/llm/tools", response_model=ListChatToolsResponse, tags=["llm"])
async def list_llm_tools(
    _: CurrentApiUser,
) -> ListChatToolsResponse:
    """Return tool metadata used by the frontend HITL/tool-policy UI."""

    return ListChatToolsResponse(tools=list_chat_tools())


@app.get("/api/v1/llm/models", response_model=ListChatModelsResponse, tags=["llm"])
async def list_llm_models(
    _: CurrentApiUser,
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


app.include_router(workspace_router)
