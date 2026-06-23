from typing import Literal

from langgraph.prebuilt import tools_condition

from agent.services.chat.state import ChatState


ChatRoute = Literal["approval_gate", "__end__"]


def route_after_chat_model(state: ChatState) -> ChatRoute:
    """최신 AIMessage에 tool call이 있으면 approval gate로 라우팅합니다."""

    route = tools_condition({"messages": state["messages"]})
    if route == "tools":
        return "approval_gate"
    return "__end__"
