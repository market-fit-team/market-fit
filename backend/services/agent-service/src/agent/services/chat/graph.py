from typing import Any

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from agent.services.chat.approvals.nodes import approval_gate, call_tools_with_approval
from agent.services.chat.nodes import call_chat_model
from agent.services.chat.routing import route_after_chat_model
from agent.services.chat.state import ChatState


# 개발용 인메모리 체크포인터입니다. 서버 재시작 시 대화 상태는 초기화됩니다.
checkpointer = InMemorySaver()


def _build_chat_graph() -> Any:
    """create_agent helper 없이 저수준 LangGraph chat/tool/HITL loop를 구성합니다."""

    builder = StateGraph(ChatState)  # pyrefly: ignore[bad-specialization] - Pyrefly/LangGraph TypedDict 호환성 이슈

    builder.add_node("chat_model", call_chat_model)
    builder.add_node("approval_gate", approval_gate)
    builder.add_node("tools", call_tools_with_approval)

    builder.add_edge(START, "chat_model")
    builder.add_conditional_edges(
        "chat_model",
        route_after_chat_model,
        {
            "approval_gate": "approval_gate",
            END: END,
        },
    )
    builder.add_edge("tools", "chat_model")

    return builder.compile(checkpointer=checkpointer)


chat_graph = _build_chat_graph()
