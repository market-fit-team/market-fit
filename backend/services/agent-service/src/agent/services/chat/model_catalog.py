from agent.schemas.chat import ListChatModelsResponse
from agent.services.chat.model_cards import list_chat_model_cards


class ChatModelCatalogError(Exception):
    """내부 chat model catalog 변환 실패."""


async def list_chat_models() -> ListChatModelsResponse:
    """내부 모델 카드 목록을 client용 chat model 목록으로 변환합니다."""

    try:
        return ListChatModelsResponse(
            object="list",
            data=[card.to_model_info() for card in list_chat_model_cards()],
        )
    except (ValueError, TypeError) as error:
        raise ChatModelCatalogError("failed to fetch chat models") from error
