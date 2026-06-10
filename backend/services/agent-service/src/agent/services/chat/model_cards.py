from dataclasses import dataclass
from typing import Literal

from agent.schemas.chat import ChatModelInfo, ReasoningEffort


ChatModelProvider = Literal["ollama", "google", "opencode_zen", "openrouter"]


class ChatModelNotFoundError(ValueError):
    """요청한 chat model id가 내부 모델 카드에 없을 때 발생합니다."""


@dataclass(frozen=True, slots=True)
class ChatModelRoute:
    provider: ChatModelProvider
    langchain_model: str
    context_window: int


@dataclass(frozen=True, slots=True)
class ChatModelCard:
    id: str
    model_family: str
    routes: tuple[ChatModelRoute, ...]
    supported_reasoning_efforts: tuple[ReasoningEffort, ...]
    default_reasoning_effort: ReasoningEffort
    fallback_retry_delay_seconds: float = 10.0
    created: int = 0
    object: str = "model"

    def to_model_info(self) -> ChatModelInfo:
        return ChatModelInfo(
            id=self.id,
            object=self.object,
            created=self.created,
            supported_reasoning_efforts=list(self.supported_reasoning_efforts),
        )


CHAT_MODEL_CARDS: tuple[ChatModelCard, ...] = (
    ChatModelCard(
        id="gpt-oss:120b",
        model_family="gpt-oss",
        routes=(
            ChatModelRoute(
                provider="ollama",
                langchain_model="gpt-oss:120b",
                context_window=128000,
            ),
        ),
        supported_reasoning_efforts=("none", "low", "medium", "high"),
        default_reasoning_effort="medium",
    ),
    ChatModelCard(
        id="gemma-4-31b-it",
        model_family="gemma-4",
        routes=(
            ChatModelRoute(
                provider="google",
                langchain_model="gemma-4-31b-it",
                context_window=1000000,
            ),
            ChatModelRoute(
                provider="openrouter",
                langchain_model="google/gemma-4-31b-it",
                context_window=1000000,
            ),
        ),
        supported_reasoning_efforts=("high",),
        default_reasoning_effort="high",
    ),
    ChatModelCard(
        id="deepseek-v4-flash",
        model_family="deepseek-v4-flash",
        routes=(
            ChatModelRoute(
                provider="opencode_zen",
                langchain_model="deepseek-v4-flash-free",
                context_window=262144,
            ),
            ChatModelRoute(
                provider="openrouter",
                langchain_model="deepseek/deepseek-v4-flash",
                context_window=262144,
            ),
        ),
        supported_reasoning_efforts=("none", "high"),
        default_reasoning_effort="high",
    ),
)


_CHAT_MODEL_CARDS_BY_ID = {card.id: card for card in CHAT_MODEL_CARDS}


def list_chat_model_cards() -> list[ChatModelCard]:
    return list(CHAT_MODEL_CARDS)


def get_chat_model_card(model_id: str) -> ChatModelCard:
    try:
        return _CHAT_MODEL_CARDS_BY_ID[model_id]
    except KeyError:
        raise ChatModelNotFoundError(f"unknown chat model: {model_id}") from None
