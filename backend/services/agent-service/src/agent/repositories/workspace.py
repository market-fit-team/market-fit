from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from agent.db.models import (
    AgentArtifactRecord,
    AgentContentRecord,
    AgentDocumentRecord,
    AgentMemoryRecord,
    AgentMessageFeedbackRecord,
    AgentOnboardingContextEventRecord,
    AgentThreadOnboardingContextRecord,
    AgentThreadRecord,
    AgentThreadSettingsRecord,
    AgentUserPreferencesRecord,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ThreadRepository:
    async def list(self, session: AsyncSession, owner: str) -> list[AgentThreadRecord]:
        result = await session.scalars(
            select(AgentThreadRecord)
            .where(
                AgentThreadRecord.auth_user_uuid == owner,
                AgentThreadRecord.deleted_at.is_(None),
            )
            .order_by(
                AgentThreadRecord.is_pinned.desc(),
                AgentThreadRecord.last_message_at.desc().nullslast(),
                AgentThreadRecord.updated_at.desc(),
            )
        )
        return list(result)

    async def get(
        self, session: AsyncSession, owner: str, thread_id: UUID
    ) -> AgentThreadRecord | None:
        return await session.scalar(
            select(AgentThreadRecord).where(
                AgentThreadRecord.id == thread_id,
                AgentThreadRecord.auth_user_uuid == owner,
                AgentThreadRecord.deleted_at.is_(None),
            )
        )

    async def create(
        self,
        session: AsyncSession,
        *,
        owner: str,
        langgraph_thread_id: str,
        title: str,
        subtitle: str | None,
    ) -> AgentThreadRecord:
        record = AgentThreadRecord(
            auth_user_uuid=owner,
            langgraph_thread_id=langgraph_thread_id,
            title=title,
            subtitle=subtitle,
        )
        session.add(record)
        await session.flush()
        return record


class ThreadSettingsRepository:
    async def get_preferences(
        self, session: AsyncSession, owner: str
    ) -> AgentUserPreferencesRecord | None:
        return await session.scalar(
            select(AgentUserPreferencesRecord).where(
                AgentUserPreferencesRecord.auth_user_uuid == owner
            )
        )

    async def get(
        self, session: AsyncSession, thread_id: UUID
    ) -> AgentThreadSettingsRecord | None:
        return await session.scalar(
            select(AgentThreadSettingsRecord).where(
                AgentThreadSettingsRecord.thread_id == thread_id
            )
        )

    async def create(
        self,
        session: AsyncSession,
        *,
        thread_id: UUID,
        model: str,
        reasoning_effort: str,
        allowed_tools: list[str],
        interrupt_on: dict[str, Any],
    ) -> AgentThreadSettingsRecord:
        record = AgentThreadSettingsRecord(
            thread_id=thread_id,
            model=model,
            reasoning_effort=reasoning_effort,
            allowed_tools_json=list(allowed_tools),
            interrupt_on_json=dict(interrupt_on),
        )
        session.add(record)
        await session.flush()
        return record


class MemoryRepository:
    async def list(
        self,
        session: AsyncSession,
        owner: str,
        *,
        enabled_only: bool = False,
        limit: int | None = None,
    ) -> list[AgentMemoryRecord]:
        statement = select(AgentMemoryRecord).where(
            AgentMemoryRecord.auth_user_uuid == owner,
            AgentMemoryRecord.deleted_at.is_(None),
        )
        if enabled_only:
            statement = statement.where(AgentMemoryRecord.is_enabled.is_(True))
        statement = statement.order_by(AgentMemoryRecord.updated_at.desc())
        if limit is not None:
            statement = statement.limit(limit)
        return list(await session.scalars(statement))

    async def get(
        self, session: AsyncSession, owner: str, memory_id: UUID
    ) -> AgentMemoryRecord | None:
        return await session.scalar(
            select(AgentMemoryRecord).where(
                AgentMemoryRecord.id == memory_id,
                AgentMemoryRecord.auth_user_uuid == owner,
                AgentMemoryRecord.deleted_at.is_(None),
            )
        )

    async def count_enabled(self, session: AsyncSession, owner: str) -> int:
        return len(
            list(
                await session.scalars(
                    select(AgentMemoryRecord.id).where(
                        AgentMemoryRecord.auth_user_uuid == owner,
                        AgentMemoryRecord.deleted_at.is_(None),
                        AgentMemoryRecord.is_enabled.is_(True),
                    )
                )
            )
        )


class ArtifactRepository:
    async def list(
        self, session: AsyncSession, owner: str, thread_id: UUID | None
    ) -> list[AgentArtifactRecord]:
        statement = select(AgentArtifactRecord).where(
            AgentArtifactRecord.auth_user_uuid == owner
        )
        if thread_id is not None:
            statement = statement.where(AgentArtifactRecord.thread_id == thread_id)
        return list(
            await session.scalars(statement.order_by(AgentArtifactRecord.updated_at.desc()))
        )

    async def get(
        self, session: AsyncSession, owner: str, artifact_id: UUID
    ) -> AgentArtifactRecord | None:
        return await session.scalar(
            select(AgentArtifactRecord).where(
                AgentArtifactRecord.id == artifact_id,
                AgentArtifactRecord.auth_user_uuid == owner,
            )
        )

    async def list_by_ids(
        self, session: AsyncSession, owner: str, artifact_ids: list[UUID]
    ) -> list[AgentArtifactRecord]:
        if not artifact_ids:
            return []
        records = list(
            await session.scalars(
                select(AgentArtifactRecord).where(
                    AgentArtifactRecord.id.in_(artifact_ids),
                    AgentArtifactRecord.auth_user_uuid == owner,
                )
            )
        )
        by_id = {record.id: record for record in records}
        return [
            record
            for artifact_id in artifact_ids
            if (record := by_id.get(artifact_id)) is not None
        ]


class ContentRepository:
    async def get(self, session: AsyncSession, content_id: UUID) -> AgentContentRecord | None:
        return await session.scalar(
            select(AgentContentRecord).where(AgentContentRecord.id == content_id)
        )

    async def list_by_ids(
        self, session: AsyncSession, content_ids: list[UUID]
    ) -> list[AgentContentRecord]:
        if not content_ids:
            return []
        records = list(
            await session.scalars(
                select(AgentContentRecord).where(AgentContentRecord.id.in_(content_ids))
            )
        )
        by_id = {record.id: record for record in records}
        return [
            record
            for content_id in content_ids
            if (record := by_id.get(content_id)) is not None
        ]


class DocumentRepository:
    async def list(self, session: AsyncSession, owner: str) -> list[AgentDocumentRecord]:
        return list(
            await session.scalars(
                select(AgentDocumentRecord)
                .where(
                    AgentDocumentRecord.auth_user_uuid == owner,
                    AgentDocumentRecord.deleted_at.is_(None),
                )
                .order_by(AgentDocumentRecord.updated_at.desc())
            )
        )

    async def list_by_ids(
        self, session: AsyncSession, owner: str, document_ids: list[UUID]
    ) -> list[AgentDocumentRecord]:
        if not document_ids:
            return []
        records = list(
            await session.scalars(
                select(AgentDocumentRecord).where(
                    AgentDocumentRecord.id.in_(document_ids),
                    AgentDocumentRecord.auth_user_uuid == owner,
                    AgentDocumentRecord.deleted_at.is_(None),
                )
            )
        )
        by_id = {record.id: record for record in records}
        return [
            record
            for document_id in document_ids
            if (record := by_id.get(document_id)) is not None
        ]

    async def get(
        self, session: AsyncSession, owner: str, document_id: UUID
    ) -> AgentDocumentRecord | None:
        return await session.scalar(
            select(AgentDocumentRecord).where(
                AgentDocumentRecord.id == document_id,
                AgentDocumentRecord.auth_user_uuid == owner,
                AgentDocumentRecord.deleted_at.is_(None),
            )
        )


class FeedbackRepository:
    async def get(
        self, session: AsyncSession, owner: str, thread_id: UUID, message_id: str
    ) -> AgentMessageFeedbackRecord | None:
        return await session.scalar(
            select(AgentMessageFeedbackRecord).where(
                AgentMessageFeedbackRecord.auth_user_uuid == owner,
                AgentMessageFeedbackRecord.thread_id == thread_id,
                AgentMessageFeedbackRecord.message_id == message_id,
            )
        )


class OnboardingContextRepository:
    async def get(
        self, session: AsyncSession, owner: str, thread_id: UUID
    ) -> AgentThreadOnboardingContextRecord | None:
        return await session.scalar(
            select(AgentThreadOnboardingContextRecord).where(
                AgentThreadOnboardingContextRecord.auth_user_uuid == owner,
                AgentThreadOnboardingContextRecord.thread_id == thread_id,
            )
        )

    async def add_event(
        self,
        session: AsyncSession,
        *,
        owner: str,
        thread_id: UUID,
        previous_result_code: str | None,
        next_result_code: str,
        selected_category_code: str | None,
        source: str,
        summary: str | None,
        diff: dict[str, Any],
        tool_call_id: str | None,
    ) -> None:
        session.add(
            AgentOnboardingContextEventRecord(
                auth_user_uuid=owner,
                thread_id=thread_id,
                previous_result_code=previous_result_code,
                next_result_code=next_result_code,
                selected_category_code=selected_category_code,
                change_source=source,
                summary=summary,
                diff_json=diff,
                tool_call_id=tool_call_id,
            )
        )


thread_repository = ThreadRepository()
thread_settings_repository = ThreadSettingsRepository()
memory_repository = MemoryRepository()
artifact_repository = ArtifactRepository()
content_repository = ContentRepository()
document_repository = DocumentRepository()
feedback_repository = FeedbackRepository()
onboarding_context_repository = OnboardingContextRepository()
