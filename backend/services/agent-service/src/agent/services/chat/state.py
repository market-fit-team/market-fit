from typing import Annotated, NotRequired, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph import add_messages

from agent.services.chat.approvals.schemas import ApprovalDecision, InterruptOnConfig
from agent.schemas.chat import ReasoningEffort


class ChatState(TypedDict):
    """LangGraph chat/tool/HITL loop 상태입니다.

    `add_messages`는 새 메시지를 추가하고 같은 id의 메시지는 교체합니다. AIMessage tool call,
    ToolMessage feedback, 사용자 승인 결과를 함께 담는 대화 상태에서 LangGraph가 기대하는
    reducer 동작입니다.
    """

    messages: Annotated[list[AnyMessage], add_messages]
    model: str
    reasoning_effort: ReasoningEffort
    allowed_tools: NotRequired[list[str]]
    interrupt_on: NotRequired[InterruptOnConfig]
    tool_approval_decisions: NotRequired[list[ApprovalDecision]]
