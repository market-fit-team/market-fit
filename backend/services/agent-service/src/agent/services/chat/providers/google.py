from typing import Any

from agent.core.config import settings
from agent.schemas.chat import ReasoningEffort
from agent.services.chat.model_cards import ChatModelRoute


def create_google_chat_model(*, route: ChatModelRoute, reasoning_effort: ReasoningEffort) -> Any:
    from langchain_google_genai import ChatGoogleGenerativeAI

    kwargs: dict[str, Any] = {
        "model": route.langchain_model,
        "api_key": settings.gemini_api_key,
    }
    if reasoning_effort != "none":
        kwargs["thinking_level"] = reasoning_effort

    return ChatGoogleGenerativeAI(**kwargs)
