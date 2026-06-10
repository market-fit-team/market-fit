from __future__ import annotations

from fastapi import FastAPI, HTTPException, status

from agent.schemas.chat import ListChatModelsResponse, ListChatToolsResponse
from agent.services.chat.model_catalog import ChatModelCatalogError, list_chat_models
from agent.services.chat.toolkits.chat_toolkit import list_chat_tools

app = FastAPI(title="Pickle Agent Custom Routes")


@app.get("/api/v1/llm/tools", response_model=ListChatToolsResponse, tags=["llm"])
async def list_llm_tools() -> ListChatToolsResponse:
    """Return tool metadata used by the frontend HITL/tool-policy UI."""

    return ListChatToolsResponse(tools=list_chat_tools())


@app.get("/api/v1/llm/models", response_model=ListChatModelsResponse, tags=["llm"])
async def list_llm_models() -> ListChatModelsResponse:
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
