from typing import Any

from agent.core.config import settings
from agent.schemas.chat import ReasoningEffort
from agent.services.chat.model_cards import ChatModelRoute


def create_openrouter_chat_model(*, route: ChatModelRoute, reasoning_effort: ReasoningEffort) -> Any:
    from langchain_openai import ChatOpenAI

    kwargs: dict[str, Any] = {
        "model": route.langchain_model,
        "api_key": settings.openrouter_api_key,
        "base_url": settings.openrouter_base_url,
        "streaming": True,
        "use_responses_api": False,
    }
    if reasoning_effort == "none":
        kwargs["extra_body"] = {"reasoning": {"enabled": False}}
    else:
        kwargs["extra_body"] = {"reasoning": {"effort": reasoning_effort}}

    return ChatOpenAI(**kwargs)
