from typing import Any

from agent.schemas.chat import ReasoningEffort
from agent.services.chat.fallback import FallbackChatModel
from agent.services.chat.model_cards import get_chat_model_card
from agent.services.chat.providers import assert_supported_reasoning_effort, create_chat_model_for_route


def get_chat_model(*, model: str, reasoning_effort: ReasoningEffort) -> Any:
    """내부 모델 카드에 맞는 fallback 가능 chat model 인스턴스를 생성합니다."""

    card = get_chat_model_card(model)
    assert_supported_reasoning_effort(card=card, reasoning_effort=reasoning_effort)
    return FallbackChatModel(
        card=card,
        reasoning_effort=reasoning_effort,
        model_factory=create_chat_model_for_route,
    )
