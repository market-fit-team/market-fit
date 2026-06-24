from agent.services.chat.approvals.schemas import (
    ApprovalActionRequest,
    ApprovalReviewConfig,
    ApprovalDecisionType,
    InterruptOnConfig,
    InterruptOnPolicy,
)
from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOL_SPECS_BY_NAME, CHAT_TOOLS_BY_NAME


def default_allowed_tools() -> list[str]:
    """기본적으로 사용자 승인 없이 실행할 수 있는 tool 목록을 새 list로 반환합니다."""

    return [spec.name for spec in CHAT_TOOL_SPECS_BY_NAME.values() if spec.default_allowed]


def default_interrupt_on_config(allowed_tools: list[str]) -> InterruptOnConfig:
    """프런트 tool policy와 같은 기본 HITL 설정을 만듭니다."""

    allowed_tool_names = set(allowed_tools)
    interrupt_on: InterruptOnConfig = {}
    for spec in CHAT_TOOL_SPECS_BY_NAME.values():
        interrupt_on[spec.name] = (
            False
            if spec.name in allowed_tool_names
            else InterruptOnPolicy(allowed_decisions=list(spec.allowed_decisions))
        )
    return interrupt_on


def default_allowed_decisions() -> list[ApprovalDecisionType]:
    """tool 승인 요청에 사용할 기본 결정 목록을 반환합니다."""

    decisions: list[ApprovalDecisionType] = []
    for spec in CHAT_TOOL_SPECS_BY_NAME.values():
        for decision in spec.allowed_decisions:
            if decision not in decisions:
                decisions.append(decision)
    return decisions


def requires_approval(
    *,
    tool_name: str,
    allowed_tools: list[str] | None = None,
    interrupt_on: InterruptOnConfig | None = None,
) -> bool:
    """tool call이 사용자 승인을 위해 일시 중단되어야 하는지 반환합니다.

    우선순위:
    1. interrupt_on[tool_name]이 있으면 해당 tool을 명시적으로 제어합니다.
       - False: 중단하지 않습니다.
       - True 또는 policy dict: 중단합니다.
    2. allowed_tools는 turn별 allowlist로 동작합니다.
    3. allowed_tools가 생략되면 ToolSpec.default_allowed를 사용합니다.
    """

    if interrupt_on is not None and tool_name in interrupt_on:
        return interrupt_on[tool_name] is not False

    allowed = set(allowed_tools if allowed_tools is not None else default_allowed_tools())
    return tool_name not in allowed


def allowed_decisions_for_tool(
    *,
    tool_name: str,
    interrupt_on: InterruptOnConfig | None = None,
) -> list[ApprovalDecisionType]:
    """client가 tool 승인 하나에 보낼 수 있는 결정 type을 반환합니다."""

    if interrupt_on is None or tool_name not in interrupt_on:
        spec = CHAT_TOOL_SPECS_BY_NAME.get(tool_name)
        return list(spec.allowed_decisions) if spec is not None else default_allowed_decisions()

    policy = interrupt_on[tool_name]
    if policy is False:
        return []
    if policy is True:
        spec = CHAT_TOOL_SPECS_BY_NAME.get(tool_name)
        return list(spec.allowed_decisions) if spec is not None else default_allowed_decisions()

    allowed_decisions = policy.get("allowed_decisions")
    if not allowed_decisions:
        spec = CHAT_TOOL_SPECS_BY_NAME.get(tool_name)
        return list(spec.allowed_decisions) if spec is not None else default_allowed_decisions()

    return list(allowed_decisions)


def build_action_request(*, tool_name: str, tool_args: dict) -> ApprovalActionRequest:
    """LangGraph interrupt()에 사용할 JSON 직렬화 가능 action request를 만듭니다."""

    tool = CHAT_TOOLS_BY_NAME.get(tool_name)
    description = tool.description if tool is not None else f"`{tool_name}` tool을 실행합니다."
    return {
        "name": tool_name,
        "args": dict(tool_args),
        "description": description,
    }


def build_review_config(
    *,
    tool_name: str,
    interrupt_on: InterruptOnConfig | None = None,
) -> ApprovalReviewConfig:
    """대기 중인 tool call에 허용되는 결정 설정을 만듭니다."""

    return {
        "action_name": tool_name,
        "allowed_decisions": allowed_decisions_for_tool(
            tool_name=tool_name, interrupt_on=interrupt_on
        ),
    }
