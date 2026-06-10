from langchain_core.tools import tool

from agent.services.chat.approvals.schemas import ApprovalDecisionType
from agent.services.chat.tools.tool_errors import InvalidToolInputError
from agent.services.chat.tools.tool_spec import ToolSpec


DEFAULT_CALCULATOR_DECISIONS: list[ApprovalDecisionType] = ["approve", "edit", "reject", "respond"]


@tool
def add(a: float, b: float) -> float:
    """두 숫자를 더한 값을 반환합니다."""

    return a + b


@tool
def subtract(a: float, b: float) -> float:
    """첫 번째 숫자에서 두 번째 숫자를 뺀 값을 반환합니다."""

    return a - b


@tool
def multiply(a: float, b: float) -> float:
    """두 숫자를 곱한 값을 반환합니다."""

    return a * b


@tool
def divide(a: float, b: float) -> float:
    """첫 번째 숫자를 두 번째 숫자로 나눈 값을 반환합니다."""

    if b == 0:
        raise InvalidToolInputError("0으로 나눌 수 없습니다.")
    return a / b


CALCULATOR_TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        tool=add,
        name="add",
        description="두 숫자를 더합니다.",
        category="calculator",
        args_schema=add.args_schema,
        default_allowed=True,
        allowed_decisions=DEFAULT_CALCULATOR_DECISIONS,
    ),
    ToolSpec(
        tool=subtract,
        name="subtract",
        description="첫 번째 숫자에서 두 번째 숫자를 뺍니다.",
        category="calculator",
        args_schema=subtract.args_schema,
        default_allowed=True,
        allowed_decisions=DEFAULT_CALCULATOR_DECISIONS,
    ),
    ToolSpec(
        tool=multiply,
        name="multiply",
        description="두 숫자를 곱합니다.",
        category="calculator",
        args_schema=multiply.args_schema,
        default_allowed=True,
        allowed_decisions=DEFAULT_CALCULATOR_DECISIONS,
    ),
    ToolSpec(
        tool=divide,
        name="divide",
        description="첫 번째 숫자를 두 번째 숫자로 나눕니다.",
        category="calculator",
        args_schema=divide.args_schema,
        default_allowed=True,
        allowed_decisions=DEFAULT_CALCULATOR_DECISIONS,
    ),
)
