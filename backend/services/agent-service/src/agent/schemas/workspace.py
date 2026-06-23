from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    model: str | None
    reasoning_effort: str | None
    allowed_tools: list[str]
    interrupt_on: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class UpdateThreadSettingsRequest(BaseModel):
    model: str | None = None
    reasoning_effort: Literal["low", "medium", "high"] | None = None
    allowed_tools: list[str] = Field(default_factory=list)
    interrupt_on: dict[str, Any] = Field(default_factory=dict)


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


class ArtifactResponse(WorkspaceModel):
    id: UUID
    thread_id: UUID
    langgraph_thread_id: str
    source_message_id: str | None
    source_tool_call_id: str | None
    type: str
    title: str
    summary: str | None
    version: int
    content: dict[str, Any]
    status: str
    created_at: datetime
    updated_at: datetime


class ArtifactListResponse(BaseModel):
    artifacts: list[ArtifactResponse]


class CreateArtifactRequest(BaseModel):
    thread_id: UUID
    type: Literal[
        "ai_report",
        "code",
        "markdown",
        "search_report",
        "personality_analysis_ref",
    ]
    title: str = Field(min_length=1, max_length=200)
    summary: str | None = None
    content: dict[str, Any] = Field(default_factory=dict)
    source_message_id: str | None = None
    source_tool_call_id: str | None = None


class UpdateArtifactRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = None
    content: dict[str, Any] | None = None
    status: Literal["active", "archived"] | None = None

    @model_validator(mode="after")
    def require_change(self) -> "UpdateArtifactRequest":
        if not self.model_fields_set:
            raise ValueError("변경할 아티팩트 필드가 필요합니다.")
        return self


class DocumentResponse(WorkspaceModel):
    id: UUID
    name: str
    path: str
    type: str
    size_bytes: int | None
    content_ref: str | None
    external_ref: str | None
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]


class CreateDocumentRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    path: str = Field(min_length=1, max_length=1000)
    type: str = Field(min_length=1, max_length=32)
    size_bytes: int | None = Field(default=None, ge=0)
    content_ref: str | None = Field(default=None, max_length=1000)
    external_ref: str | None = Field(default=None, max_length=1000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AttachDocumentsRequest(BaseModel):
    message_id: str = Field(min_length=1, max_length=128)
    document_ids: list[UUID] = Field(min_length=1, max_length=20)


class MessageAttachmentResponse(WorkspaceModel):
    id: UUID
    thread_id: UUID
    message_id: str
    document_id: UUID
    attached_snapshot: dict[str, Any]
    created_at: datetime


class MessageAttachmentListResponse(BaseModel):
    attachments: list[MessageAttachmentResponse]


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
