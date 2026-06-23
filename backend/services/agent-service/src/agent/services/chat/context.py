from __future__ import annotations

from typing import NotRequired, TypedDict

from agent.schemas.chat import ReasoningEffort
from agent.services.chat.approvals.schemas import InterruptOnConfig
from agent.services.chat.model_cards import get_chat_model_card, list_chat_model_cards


class ChatRuntimeContext(TypedDict):
    """한 번의 run 동안 변하지 않는 실행 설정.

    messages 같은 대화 상태는 ChatState에 둔다.
    model, reasoning_effort, allowed_tools, interrupt_on은 runtime context로 받는다.

    LangGraph 0.6+에서는 config["configurable"] 대신 context_schema + Runtime.context를 쓴다.
    참고:
    https://reference.langchain.com/python/langgraph/graph/state/StateGraph
    https://reference.langchain.com/python/langgraph/runtime/Runtime
    """

    model: NotRequired[str]
    reasoning_effort: NotRequired[ReasoningEffort]
    allowed_tools: NotRequired[list[str]]
    interrupt_on: NotRequired[InterruptOnConfig]
    auth_user_uuid: NotRequired[str]
    access_token: NotRequired[str]
    app_thread_id: NotRequired[str]


class ResolvedChatRuntimeContext(TypedDict):
    """graph node가 실제 모델 호출에 사용하는 최소 실행 context."""

    model: str
    reasoning_effort: ReasoningEffort


def _default_model_id() -> str:
    """카탈로그의 첫 번째 모델을 서버 기본 모델로 사용한다."""

    cards = list_chat_model_cards()
    if not cards:
        raise ValueError("chat model catalog is empty")
    return cards[0].id


def resolve_chat_model_context(context: ChatRuntimeContext | None) -> ResolvedChatRuntimeContext:
    """Agent Server context에서 모델 호출에 필요한 값을 안전하게 확정합니다.

    프론트는 최초 submit과 interrupt resume 모두 full context를 보내야 하지만,
    운영 중 과거 클라이언트/수동 API 호출이 섞일 수 있으므로 서버도 기본값으로 방어합니다.
    reasoning_effort가 누락된 경우에는 선택된 모델 카드의 기본 effort를 사용합니다.

    근거:
    - Agent Server run body의 context는 static context입니다.
      https://docs.langchain.com/langsmith/agent-server-api/thread-runs/create-run-stream-output
    - Runtime.context는 graph run-scoped 의존성을 node에 주입합니다.
      https://reference.langchain.com/python/langgraph/runtime/Runtime
    """

    raw_context = context or {}
    model = raw_context.get("model") or _default_model_id()
    model_card = get_chat_model_card(model)
    reasoning_effort = raw_context.get("reasoning_effort") or model_card.default_reasoning_effort

    return {
        "model": model,
        "reasoning_effort": reasoning_effort,
    }
