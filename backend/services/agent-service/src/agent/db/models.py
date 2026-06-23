from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from agent.db.base import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utc_now, onupdate=_utc_now
    )


class AgentThreadRecord(TimestampMixin, Base):
    __tablename__ = "agent_threads"
    __table_args__ = (
        Index("ix_agent_threads_owner_deleted", "auth_user_uuid", "deleted_at"),
        Index("ix_agent_threads_owner_last_message", "auth_user_uuid", "last_message_at"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    langgraph_thread_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False, default="새 대화")
    subtitle: Mapped[str | None] = mapped_column(String(240))
    last_message_preview: Mapped[str | None] = mapped_column(String(500))
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgentThreadSettingsRecord(TimestampMixin, Base):
    __tablename__ = "agent_thread_settings"
    __table_args__ = (UniqueConstraint("thread_id", name="uq_agent_thread_settings_thread_id"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    thread_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_threads.id", ondelete="CASCADE"), nullable=False
    )
    model: Mapped[str | None] = mapped_column(String(128))
    reasoning_effort: Mapped[str | None] = mapped_column(String(32))
    allowed_tools_json: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    interrupt_on_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class AgentUserPreferencesRecord(TimestampMixin, Base):
    __tablename__ = "agent_user_preferences"
    __table_args__ = (
        UniqueConstraint("auth_user_uuid", name="uq_agent_user_preferences_owner"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    default_model: Mapped[str | None] = mapped_column(String(128))
    default_reasoning_effort: Mapped[str | None] = mapped_column(String(32))
    default_allowed_tools_json: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    default_interrupt_on_json: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    sidebar_tab: Mapped[str | None] = mapped_column(String(32))
    document_view_mode: Mapped[str | None] = mapped_column(String(32))
    panel_layout_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)


class AgentMemoryRecord(TimestampMixin, Base):
    __tablename__ = "agent_memories"
    __table_args__ = (Index("ix_agent_memories_owner_deleted", "auth_user_uuid", "deleted_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgentThreadOnboardingContextRecord(TimestampMixin, Base):
    __tablename__ = "agent_thread_onboarding_contexts"
    __table_args__ = (
        UniqueConstraint("thread_id", name="uq_agent_thread_onboarding_context_thread"),
        Index("ix_agent_thread_onboarding_context_owner", "auth_user_uuid"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    thread_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_threads.id", ondelete="CASCADE"), nullable=False
    )
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    result_code: Mapped[str] = mapped_column(String(64), nullable=False)
    selected_category_code: Mapped[str | None] = mapped_column(String(32))
    source: Mapped[str] = mapped_column(String(32), nullable=False, default="manual_attach")
    attached_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utc_now
    )


class AgentOnboardingContextEventRecord(Base):
    __tablename__ = "agent_onboarding_context_events"
    __table_args__ = (Index("ix_agent_onboarding_events_owner", "auth_user_uuid"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    thread_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_threads.id", ondelete="CASCADE"), nullable=False
    )
    previous_result_code: Mapped[str | None] = mapped_column(String(64))
    next_result_code: Mapped[str] = mapped_column(String(64), nullable=False)
    selected_category_code: Mapped[str | None] = mapped_column(String(32))
    change_source: Mapped[str] = mapped_column(String(32), nullable=False)
    tool_call_id: Mapped[str | None] = mapped_column(String(128))
    summary: Mapped[str | None] = mapped_column(Text)
    diff_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utc_now
    )


class AgentArtifactRecord(TimestampMixin, Base):
    __tablename__ = "agent_artifacts"
    __table_args__ = (Index("ix_agent_artifacts_owner_thread", "auth_user_uuid", "thread_id"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    thread_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_threads.id", ondelete="CASCADE"), nullable=False
    )
    langgraph_thread_id: Mapped[str] = mapped_column(String(128), nullable=False)
    source_message_id: Mapped[str | None] = mapped_column(String(128))
    source_tool_call_id: Mapped[str | None] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(48), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    content_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")


class AgentDocumentRecord(TimestampMixin, Base):
    __tablename__ = "agent_documents"
    __table_args__ = (Index("ix_agent_documents_owner_deleted", "auth_user_uuid", "deleted_at"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(1000), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    content_ref: Mapped[str | None] = mapped_column(String(1000))
    external_ref: Mapped[str | None] = mapped_column(String(1000))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AgentMessageAttachmentRecord(Base):
    __tablename__ = "agent_message_attachments"
    __table_args__ = (
        UniqueConstraint(
            "auth_user_uuid",
            "thread_id",
            "message_id",
            "document_id",
            name="uq_agent_message_attachment",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    thread_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_threads.id", ondelete="CASCADE"), nullable=False
    )
    langgraph_thread_id: Mapped[str] = mapped_column(String(128), nullable=False)
    message_id: Mapped[str] = mapped_column(String(128), nullable=False)
    document_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_documents.id", ondelete="CASCADE"), nullable=False
    )
    attached_snapshot_json: Mapped[dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utc_now
    )


class AgentMessageFeedbackRecord(TimestampMixin, Base):
    __tablename__ = "agent_message_feedback"
    __table_args__ = (
        UniqueConstraint(
            "auth_user_uuid",
            "thread_id",
            "message_id",
            name="uq_agent_message_feedback",
        ),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False)
    thread_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_threads.id", ondelete="CASCADE"), nullable=False
    )
    langgraph_thread_id: Mapped[str] = mapped_column(String(128), nullable=False)
    message_id: Mapped[str] = mapped_column(String(128), nullable=False)
    rating: Mapped[str] = mapped_column(String(16), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)


class AgentHitlEventRecord(Base):
    __tablename__ = "agent_hitl_events"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    auth_user_uuid: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    thread_id: Mapped[UUID] = mapped_column(
        ForeignKey("agent_threads.id", ondelete="CASCADE"), nullable=False
    )
    langgraph_thread_id: Mapped[str] = mapped_column(String(128), nullable=False)
    interrupt_id: Mapped[str | None] = mapped_column(String(128))
    tool_call_id: Mapped[str | None] = mapped_column(String(128))
    action_requests_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    review_configs_json: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    decision_json: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utc_now
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
