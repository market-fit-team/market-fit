from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from agent.schemas.chat import ReasoningEffort


class WorkspaceModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AgentThreadResponse(WorkspaceModel):
    id: UUID
    langgraph_thread_id: str
    title: str
    subtitle: str | None
    last_message_preview: str | None
    message_count: int
    is_pinned: bool
    is_archived: bool
    last_message_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AgentThreadListResponse(BaseModel):
    threads: list[AgentThreadResponse]


class CreateAgentThreadRequest(BaseModel):
    title: str = Field(default="새 대화", min_length=1, max_length=160)
    subtitle: str | None = Field(default=None, max_length=240)


class UpdateAgentThreadRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    subtitle: str | None = Field(default=None, max_length=240)
    is_pinned: bool | None = None
    is_archived: bool | None = None

    @model_validator(mode="after")
    def require_change(self) -> "UpdateAgentThreadRequest":
        if not self.model_fields_set:
            raise ValueError("변경할 스레드 필드가 필요합니다.")
        return self


class ThreadSettingsResponse(WorkspaceModel):
    model: str
    reasoning_effort: ReasoningEffort
    allowed_tools: list[str]
    interrupt_on: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class UpdateThreadSettingsRequest(BaseModel):
    model: str = Field(min_length=1, max_length=128)
    reasoning_effort: ReasoningEffort
    allowed_tools: list[str]
    interrupt_on: dict[str, Any]


class MemoryResponse(WorkspaceModel):
    id: UUID
    content: str
    source: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime


class MemoryListResponse(BaseModel):
    memories: list[MemoryResponse]


class CreateMemoryRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class UpdateMemoryRequest(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=4000)
    is_enabled: bool | None = None

    @model_validator(mode="after")
    def require_change(self) -> "UpdateMemoryRequest":
        if not self.model_fields_set:
            raise ValueError("변경할 메모리 필드가 필요합니다.")
        return self


ContentType = Literal[
    "commercial_report",
    "search_report",
    "research_report",
    "markdown",
    "code",
]


class ArtifactResponse(WorkspaceModel):
    id: UUID
    thread_id: UUID
    langgraph_thread_id: str
    source_message_id: str | None
    source_tool_call_id: str | None
    type: ContentType
    title: str | None
    summary: str | None
    raw_text: str
    version: int
    created_at: datetime
    updated_at: datetime


class ArtifactListResponse(BaseModel):
    artifacts: list[ArtifactResponse]


class CreateArtifactRequest(BaseModel):
    thread_id: UUID
    type: ContentType
    title: str | None = Field(default=None, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    raw_text: str = Field(min_length=1)
    source_message_id: str | None = None
    source_tool_call_id: str | None = None


class UpdateArtifactRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    raw_text: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def require_change(self) -> "UpdateArtifactRequest":
        if not self.model_fields_set:
            raise ValueError("변경할 아티팩트 필드가 필요합니다.")
        return self


class DocumentResponse(WorkspaceModel):
    id: UUID
    type: ContentType
    title: str | None
    summary: str | None
    raw_text: str
    source_artifact_id: UUID | None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


class CreateDocumentRequest(BaseModel):
    type: ContentType
    title: str | None = Field(default=None, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    raw_text: str = Field(min_length=1)
    source_artifact_id: UUID | None = None


class UpdateDocumentRequest(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    raw_text: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def require_change(self) -> "UpdateDocumentRequest":
        if not self.model_fields_set:
            raise ValueError("변경할 문서 필드가 필요합니다.")
        return self


class MessageFeedbackRequest(BaseModel):
    thread_id: UUID
    rating: Literal["like", "dislike"]
    comment: str | None = Field(default=None, max_length=2000)


class MessageFeedbackResponse(WorkspaceModel):
    id: UUID
    thread_id: UUID
    langgraph_thread_id: str
    message_id: str
    rating: str
    comment: str | None
    created_at: datetime
    updated_at: datetime


class OnboardingContextResponse(WorkspaceModel):
    thread_id: UUID
    result_code: str
    selected_category_code: str | None
    source: str
    attached_at: datetime
    updated_at: datetime


class SetOnboardingContextRequest(BaseModel):
    result_code: str = Field(min_length=1, max_length=64)
    selected_category_code: str | None = Field(default=None, max_length=32)
    source: Literal["default_profile", "manual_attach", "agent_update"] = "manual_attach"
    summary: str | None = Field(default=None, max_length=4000)
    diff: dict[str, Any] = Field(default_factory=dict)
    tool_call_id: str | None = Field(default=None, max_length=128)
