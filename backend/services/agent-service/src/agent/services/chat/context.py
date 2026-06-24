from __future__ import annotations

from typing import NotRequired, Required, TypedDict

from agent.schemas.chat import ReasoningEffort
from agent.services.chat.approvals.schemas import InterruptOnConfig
from agent.services.chat.model_cards import get_chat_model_card


class ChatRuntimeContext(TypedDict, total=False):
    """한 번의 run 동안 변하지 않는 실행 설정.

    messages 같은 대화 상태는 ChatState에 둔다.
    model, reasoning_effort, allowed_tools, interrupt_on은 runtime context로 받는다.

    LangGraph 0.6+에서는 config["configurable"] 대신 context_schema + Runtime.context를 쓴다.
    참고:
    https://reference.langchain.com/python/langgraph/graph/state/StateGraph
    https://reference.langchain.com/python/langgraph/runtime/Runtime
    """

    model: Required[str]
    reasoning_effort: Required[ReasoningEffort]
    allowed_tools: Required[list[str]]
    interrupt_on: Required[InterruptOnConfig]
    auth_user_uuid: NotRequired[str]
    access_token: NotRequired[str]
    app_thread_id: NotRequired[str]
    selected_document_ids: NotRequired[list[str]]
    selected_artifact_ids: NotRequired[list[str]]


class ResolvedChatRuntimeContext(TypedDict):
    """graph node가 실제 모델 호출에 사용하는 최소 실행 context."""

    model: str
    reasoning_effort: ReasoningEffort


def resolve_chat_model_context(context: ChatRuntimeContext | None) -> ResolvedChatRuntimeContext:
    """Agent Server context에서 모델 호출에 필요한 값을 검증합니다.

    기본값은 thread settings 생성 시점에만 확정합니다. graph 실행 중 누락된
    context를 보정하면 refresh 뒤 resume가 다른 설정으로 이어질 수 있습니다.

    근거:
    - Protocol V2 command의 run.start/input.respond가 run-level config를 보냅니다.
      https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
    - Runtime.context는 graph run-scoped 의존성을 node에 주입합니다.
      https://reference.langchain.com/python/langgraph/runtime/Runtime
    """

    raw_context = context or {}
    model = raw_context.get("model")
    if not isinstance(model, str) or not model:
        raise ValueError("chat runtime context model is required")

    model_card = get_chat_model_card(model)
    reasoning_effort = raw_context.get("reasoning_effort")
    if reasoning_effort not in model_card.supported_reasoning_efforts:
        raise ValueError(
            f"unsupported reasoning effort for {model}: {reasoning_effort}"
        )

    return {
        "model": model,
        "reasoning_effort": reasoning_effort,
    }
