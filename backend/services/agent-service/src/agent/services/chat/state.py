from typing import Annotated, NotRequired, TypedDict

from langchain_core.messages import AnyMessage
from langgraph.graph import add_messages

from agent.services.chat.approvals.schemas import ApprovalDecision


class SelectedDocumentContextState(TypedDict):
    id: str
    type: str
    title: str | None
    summary: str | None


class SelectedArtifactContextState(TypedDict):
    id: str
    type: str
    title: str | None
    summary: str | None
    version: int


class MemorySummary(TypedDict):
    has_memories: bool
    memory_count: int


class OnboardingSummary(TypedDict):
    has_default_profile: bool
    has_thread_context: bool
    result_code: str | None
    selected_category_code: str | None
    source: str | None


class SystemContextState(TypedDict):
    selected_documents: list[SelectedDocumentContextState]
    selected_artifacts: list[SelectedArtifactContextState]
    memory_summary: MemorySummary | None
    onboarding_summary: OnboardingSummary | None


class SystemContextRefreshState(TypedDict):
    memory_summary_dirty: bool
    onboarding_summary_dirty: bool


class ChatState(TypedDict):
    """LangGraph chat/tool/HITL loop 상태입니다.

    `add_messages`는 새 메시지를 추가하고 같은 id의 메시지는 교체합니다. AIMessage tool call,
    ToolMessage feedback, 사용자 승인 결과를 함께 담는 대화 상태에서 LangGraph가 기대하는
    reducer 동작입니다.
    """

    messages: Annotated[list[AnyMessage], add_messages]
    tool_approval_decisions: NotRequired[list[ApprovalDecision]]
    system_context: NotRequired[SystemContextState]
    system_context_refresh: NotRequired[SystemContextRefreshState]
