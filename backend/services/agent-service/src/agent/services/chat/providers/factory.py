from typing import Any

from agent.schemas.chat import ReasoningEffort
from agent.services.chat.model_cards import ChatModelCard, ChatModelRoute
from agent.services.chat.providers.google import create_google_chat_model
from agent.services.chat.providers.ollama import create_ollama_chat_model
from agent.services.chat.providers.opencode_zen import create_opencode_zen_chat_model
from agent.services.chat.providers.openrouter import create_openrouter_chat_model


class UnsupportedReasoningEffortError(ValueError):
    """선택한 모델 카드에서 지원하지 않는 reasoning effort입니다."""


def assert_supported_reasoning_effort(*, card: ChatModelCard, reasoning_effort: ReasoningEffort) -> None:
    if reasoning_effort not in card.supported_reasoning_efforts:
        supported = ", ".join(card.supported_reasoning_efforts)
        raise UnsupportedReasoningEffortError(
            f"{card.id} supports reasoning_effort values: {supported}"
        )


def create_chat_model_for_route(route: ChatModelRoute, reasoning_effort: ReasoningEffort) -> Any:
    if route.provider == "ollama":
        return create_ollama_chat_model(route=route, reasoning_effort=reasoning_effort)

    if route.provider == "google":
        return create_google_chat_model(route=route, reasoning_effort=reasoning_effort)

    if route.provider == "opencode_zen":
        return create_opencode_zen_chat_model(route=route, reasoning_effort=reasoning_effort)

    if route.provider == "openrouter":
        return create_openrouter_chat_model(route=route, reasoning_effort=reasoning_effort)

    raise ValueError(f"unsupported chat model provider: {route.provider}")
