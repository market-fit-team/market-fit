from typing import cast

from langchain_core.messages import AnyMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from agent.services.chat.models import get_chat_model
from agent.services.chat.state import ChatState
from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOLS


CHAT_SYSTEM_PROMPT = "도구 호출이 완료된 뒤에는 결과를 사용자에게 보고해야 합니다."


async def call_chat_model(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, list[AnyMessage]]:
    """등록된 tool schema를 붙여 chat model을 호출하는 LangGraph node입니다."""

    model = get_chat_model(
        model=state["model"],
        reasoning_effort=state["reasoning_effort"],
    ).bind_tools(CHAT_TOOLS)
    response = await model.ainvoke(
        [SystemMessage(content=CHAT_SYSTEM_PROMPT), *state["messages"]],
        config=config,
    )
    return {"messages": [cast(AnyMessage, response)]}


