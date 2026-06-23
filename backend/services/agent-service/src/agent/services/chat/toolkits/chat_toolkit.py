from typing import Final

from langchain_core.tools import BaseTool

from agent.schemas.chat import ChatToolInfo
from agent.services.chat.approvals.schemas import ApprovalDecisionType
from agent.services.chat.tools.calculator_tool import CALCULATOR_TOOL_SPECS
from agent.services.chat.tools.artifact_tool import ARTIFACT_TOOL_SPECS
from agent.services.chat.tools.document_tool import DOCUMENT_TOOL_SPECS
from agent.services.chat.tools.memory_tool import MEMORY_TOOL_SPECS
from agent.services.chat.tools.onboarding_tool import ONBOARDING_TOOL_SPECS
from agent.services.chat.tools.tool_spec import ToolSpec, validate_tool_specs


CHAT_TOOL_SPECS: Final[tuple[ToolSpec, ...]] = validate_tool_specs(
    (
        *CALCULATOR_TOOL_SPECS,
        *MEMORY_TOOL_SPECS,
        *ARTIFACT_TOOL_SPECS,
        *DOCUMENT_TOOL_SPECS,
        *ONBOARDING_TOOL_SPECS,
    )
)

CHAT_TOOLS: Final[list[BaseTool]] = [spec.tool for spec in CHAT_TOOL_SPECS]
CHAT_TOOLS_BY_NAME: Final[dict[str, BaseTool]] = {spec.name: spec.tool for spec in CHAT_TOOL_SPECS}
CHAT_TOOL_SPECS_BY_NAME: Final[dict[str, ToolSpec]] = {spec.name: spec for spec in CHAT_TOOL_SPECS}


def default_allowed_tools() -> list[str]:
    """기본적으로 사용자 승인 없이 실행할 수 있는 tool 목록을 새 list로 반환합니다."""

    return [spec.name for spec in CHAT_TOOL_SPECS if spec.default_allowed]


def default_allowed_decisions() -> list[ApprovalDecisionType]:
    """tool 승인 요청에 사용할 기본 결정 목록을 반환합니다."""

    decisions: list[ApprovalDecisionType] = []
    for spec in CHAT_TOOL_SPECS:
        for decision in spec.allowed_decisions:
            if decision not in decisions:
                decisions.append(decision)
    return decisions


def list_chat_tools() -> list[ChatToolInfo]:
    """API client와 정책 UI가 사용할 등록된 chat tool metadata를 반환합니다."""

    return [
        ChatToolInfo(
            name=spec.name,
            description=spec.description,
            category=spec.category,
            default_allowed=spec.default_allowed,
            allowed_decisions=list(spec.allowed_decisions),
        )
        for spec in CHAT_TOOL_SPECS
    ]
