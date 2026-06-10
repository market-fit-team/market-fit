from typing import Any, Literal, NotRequired, TypeAlias, TypedDict


HitlDecisionType = Literal["approve", "edit", "reject", "respond"]
ApprovalDecisionType = HitlDecisionType


class HitlAction(TypedDict):
    name: str
    args: dict[str, Any]


class HitlDecision(TypedDict, total=False):
    """humanInTheLoopMiddleware 표준 resume decision입니다."""

    type: HitlDecisionType
    message: str
    editedAction: HitlAction


class HitlActionRequest(TypedDict):
    """humanInTheLoopMiddleware 표준 action request입니다."""

    name: str
    args: dict[str, Any]
    description: str


class HitlReviewConfig(TypedDict):
    """humanInTheLoopMiddleware 표준 review config입니다."""

    action_name: str
    allowed_decisions: list[HitlDecisionType]
    args_schema: NotRequired[dict[str, Any]]


class InterruptOnPolicy(TypedDict, total=False):
    """LangChain/DeepAgents interrupt_on 형태와 호환되는 tool별 HITL 정책입니다."""

    allowed_decisions: list[HitlDecisionType]


InterruptOnConfig: TypeAlias = dict[str, bool | InterruptOnPolicy]


class HitlRequest(TypedDict):
    """LangGraph interrupt()에 전달되는 HumanInTheLoop 표준 payload입니다."""

    action_requests: list[HitlActionRequest]
    review_configs: list[HitlReviewConfig]


class HitlResume(TypedDict):
    """interrupt 이후 approval gate가 기대하는 표준 resume payload입니다."""

    decisions: list[HitlDecision]


ApprovalDecision = HitlDecision
ApprovalActionRequest = HitlActionRequest
ApprovalReviewConfig = HitlReviewConfig
ApprovalInterruptPayload = HitlRequest
ApprovalResumePayload = HitlResume
