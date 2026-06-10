from typing import Literal, cast

from pydantic import BaseModel, ConfigDict, Field


ChatApprovalDecisionType = Literal["approve", "edit", "reject", "respond"]
ReasoningEffort = Literal["none", "low", "medium", "high"]




class ChatToolInfo(BaseModel):
    """클라이언트가 HITL 정책 UI를 구성할 때 쓰는 tool 정보."""

    model_config = ConfigDict(extra="forbid")

    name: str
    description: str
    category: str
    default_allowed: bool
    allowed_decisions: list[ChatApprovalDecisionType]


class ListChatToolsResponse(BaseModel):
    """현재 chat agent에 등록된 tool 목록."""

    model_config = ConfigDict(extra="forbid")

    tools: list[ChatToolInfo]


class ChatModelInfo(BaseModel):
    """클라이언트가 선택할 수 있는 chat model 정보."""

    model_config = ConfigDict(extra="forbid")

    id: str
    object: str
    created: int
    supported_reasoning_efforts: list[ReasoningEffort]


class ListChatModelsResponse(BaseModel):
    """내부 chat model catalog 목록을 client용 계약으로 변환한 응답."""

    model_config = ConfigDict(extra="forbid")

    object: str
    data: list[ChatModelInfo]
