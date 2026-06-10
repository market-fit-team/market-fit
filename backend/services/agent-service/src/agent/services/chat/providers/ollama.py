from typing import Any

from langchain_ollama import ChatOllama

from agent.core.config import settings
from agent.schemas.chat import ReasoningEffort
from agent.services.chat.model_cards import ChatModelRoute


def create_ollama_chat_model(*, route: ChatModelRoute, reasoning_effort: ReasoningEffort) -> ChatOllama:
    kwargs: dict[str, Any] = {
        "model": route.langchain_model,
        "base_url": settings.ollama_base_url,
        "num_ctx": route.context_window,
        "reasoning": False if reasoning_effort == "none" else reasoning_effort,
    }
    if settings.ollama_api_key:
        headers = {"Authorization": f"Bearer {settings.ollama_api_key}"}
        kwargs["client_kwargs"] = {"headers": headers}
        kwargs["async_client_kwargs"] = {"headers": headers}
        kwargs["sync_client_kwargs"] = {"headers": headers}

    return ChatOllama(**kwargs)
