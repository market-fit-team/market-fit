from langchain_core.messages import AnyMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.runtime import get_runtime

from agent.services.chat.context import ChatRuntimeContext, resolve_chat_model_context
from agent.services.chat.models import get_chat_model
from agent.services.chat.state import ChatState
from agent.services.chat.system_context import (
    append_system_context_to_latest_human_message,
    build_system_context,
)
from agent.services.chat.system_context_state import prepare_system_context_state_update
from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOLS


CHAT_SYSTEM_PROMPT = "도구 호출이 완료된 뒤에는 결과를 사용자에게 보고해야 합니다."


def _should_bind_tools(messages: list[AnyMessage]) -> bool:
    """마지막 메시지가 tool 결과이면 다음 model 호출은 최종 답변만 생성하게 합니다."""

    return not messages or not isinstance(messages[-1], ToolMessage)


async def prepare_system_context_state(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, object]:
    """세션 스냅샷형 system_context 상태를 초기화·갱신합니다."""

    runtime = get_runtime(ChatRuntimeContext)
    return await prepare_system_context_state_update(
        state.get("system_context"),
        state.get("system_context_refresh"),
        config=config,
        context=runtime.context,
        # Runtime.server_info.user는 LangGraph Server가 인증 완료 후 주입하는 사용자다.
        # 도구 실행 전 system_context도 도구와 같은 owner 기준을 써야 한다.
        # https://docs.langchain.com/oss/python/langchain/tools#server-info
        server_user=runtime.server_info.user if runtime.server_info is not None else None,
    )


async def call_chat_model(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, list[AnyMessage]]:
    """등록된 tool schema를 붙여 chat model을 호출하는 LangGraph node입니다."""

    runtime = get_runtime(ChatRuntimeContext)
    context = resolve_chat_model_context(runtime.context)
    input_messages = append_system_context_to_latest_human_message(
        list(state["messages"]),
        build_system_context(state.get("system_context")),
    )
    model = get_chat_model(
        model=context["model"],
        reasoning_effort=context["reasoning_effort"],
    )
    # interrupt resume 뒤 tool 결과가 들어오면 model은 사용자에게 결과를 보고해야 합니다.
    # 이 호출에서 도구를 다시 바인딩하면 같은 tool call이 재생성되어 같은 승인 카드가 반복될 수 있습니다.
    # https://docs.langchain.com/oss/python/langgraph/interrupts
    if _should_bind_tools(input_messages):
        model = model.bind_tools(CHAT_TOOLS)
    response: AnyMessage = await model.ainvoke(
        [SystemMessage(content=CHAT_SYSTEM_PROMPT), *input_messages],
        config=config,
    )
    return {"messages": [response]}
