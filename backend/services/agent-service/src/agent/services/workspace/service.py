from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from agent.clients.agent_server import ThreadCreator, agent_server_client
from agent.db.models import (
    AgentArtifactRecord,
    AgentDocumentRecord,
    AgentMemoryRecord,
    AgentMessageAttachmentRecord,
    AgentMessageFeedbackRecord,
    AgentThreadOnboardingContextRecord,
)
from agent.repositories.workspace import (
    artifact_repository,
    document_repository,
    feedback_repository,
    memory_repository,
    onboarding_context_repository,
    thread_repository,
    thread_settings_repository,
    utc_now,
)
from agent.schemas.workspace import (
    AgentThreadResponse,
    ArtifactResponse,
    AttachDocumentsRequest,
    CreateAgentThreadRequest,
    CreateArtifactRequest,
    CreateDocumentRequest,
    CreateMemoryRequest,
    DocumentResponse,
    MemoryResponse,
    MessageAttachmentResponse,
    MessageFeedbackRequest,
    MessageFeedbackResponse,
    OnboardingContextResponse,
    SetOnboardingContextRequest,
    ThreadSettingsResponse,
    UpdateAgentThreadRequest,
    UpdateArtifactRequest,
    UpdateMemoryRequest,
    UpdateThreadSettingsRequest,
)


def _not_found(resource: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource}을 찾을 수 없습니다.")


def _thread_response(record: Any) -> AgentThreadResponse:
    return AgentThreadResponse.model_validate(record)


def _settings_response(record: Any) -> ThreadSettingsResponse:
    return ThreadSettingsResponse(
        model=record.model,
        reasoning_effort=record.reasoning_effort,
        allowed_tools=list(record.allowed_tools_json),
        interrupt_on=dict(record.interrupt_on_json),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _memory_response(record: Any) -> MemoryResponse:
    return MemoryResponse.model_validate(record)


def _artifact_response(record: Any) -> ArtifactResponse:
    return ArtifactResponse(
        id=record.id,
        thread_id=record.thread_id,
        langgraph_thread_id=record.langgraph_thread_id,
        source_message_id=record.source_message_id,
        source_tool_call_id=record.source_tool_call_id,
        type=record.type,
        title=record.title,
        summary=record.summary,
        version=record.version,
        content=dict(record.content_json),
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _document_response(record: Any) -> DocumentResponse:
    return DocumentResponse(
        id=record.id,
        name=record.name,
        path=record.path,
        type=record.type,
        size_bytes=record.size_bytes,
        content_ref=record.content_ref,
        external_ref=record.external_ref,
        metadata=dict(record.metadata_json),
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _feedback_response(record: Any) -> MessageFeedbackResponse:
    return MessageFeedbackResponse.model_validate(record)


def _onboarding_context_response(record: Any) -> OnboardingContextResponse:
    return OnboardingContextResponse.model_validate(record)


class WorkspaceService:
    def __init__(self, agent_client: ThreadCreator = agent_server_client) -> None:
        self._agent_client = agent_client

    async def list_threads(
        self, session: AsyncSession, owner: str
    ) -> list[AgentThreadResponse]:
        return [_thread_response(item) for item in await thread_repository.list(session, owner)]

    async def create_thread(
        self,
        session: AsyncSession,
        *,
        owner: str,
        access_token: str,
        request: CreateAgentThreadRequest,
    ) -> AgentThreadResponse:
        langgraph_thread_id = await self._agent_client.create_thread(
            access_token=access_token, owner=owner
        )
        record = await thread_repository.create(
            session,
            owner=owner,
            langgraph_thread_id=langgraph_thread_id,
            title=request.title,
            subtitle=request.subtitle,
        )
        await thread_settings_repository.create_from_preferences(
            session, owner=owner, thread_id=record.id
        )
        await session.commit()
        await session.refresh(record)
        return _thread_response(record)

    async def update_thread(
        self,
        session: AsyncSession,
        *,
        owner: str,
        thread_id: UUID,
        request: UpdateAgentThreadRequest,
    ) -> AgentThreadResponse:
        record = await thread_repository.get(session, owner, thread_id)
        if record is None:
            raise _not_found("스레드")
        for field, value in request.model_dump(exclude_unset=True).items():
            setattr(record, field, value)
        await session.commit()
        await session.refresh(record)
        return _thread_response(record)

    async def delete_thread(
        self, session: AsyncSession, *, owner: str, thread_id: UUID
    ) -> None:
        record = await thread_repository.get(session, owner, thread_id)
        if record is None:
            raise _not_found("스레드")
        record.deleted_at = utc_now()
        await session.commit()

    async def get_settings(
        self, session: AsyncSession, *, owner: str, thread_id: UUID
    ) -> ThreadSettingsResponse:
        thread = await thread_repository.get(session, owner, thread_id)
        if thread is None:
            raise _not_found("스레드")
        record = await thread_settings_repository.get(session, thread_id)
        if record is None:
            record = await thread_settings_repository.create_from_preferences(
                session, owner=owner, thread_id=thread_id
            )
            await session.commit()
            await session.refresh(record)
        return _settings_response(record)

    async def update_settings(
        self,
        session: AsyncSession,
        *,
        owner: str,
        thread_id: UUID,
        request: UpdateThreadSettingsRequest,
    ) -> ThreadSettingsResponse:
        thread = await thread_repository.get(session, owner, thread_id)
        if thread is None:
            raise _not_found("스레드")
        record = await thread_settings_repository.get(session, thread_id)
        if record is None:
            record = await thread_settings_repository.create_from_preferences(
                session, owner=owner, thread_id=thread_id
            )
        record.model = request.model
        record.reasoning_effort = request.reasoning_effort
        record.allowed_tools_json = list(request.allowed_tools)
        record.interrupt_on_json = dict(request.interrupt_on)
        await session.commit()
        await session.refresh(record)
        return _settings_response(record)

    async def list_memories(
        self, session: AsyncSession, owner: str
    ) -> list[MemoryResponse]:
        return [_memory_response(item) for item in await memory_repository.list(session, owner)]

    async def create_memory(
        self,
        session: AsyncSession,
        *,
        owner: str,
        request: CreateMemoryRequest,
        source: str = "manual",
    ) -> MemoryResponse:
        record = AgentMemoryRecord(
            auth_user_uuid=owner,
            content=request.content.strip(),
            source=source,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return _memory_response(record)

    async def update_memory(
        self,
        session: AsyncSession,
        *,
        owner: str,
        memory_id: UUID,
        request: UpdateMemoryRequest,
    ) -> MemoryResponse:
        record = await memory_repository.get(session, owner, memory_id)
        if record is None:
            raise _not_found("메모리")
        for field, value in request.model_dump(exclude_unset=True).items():
            setattr(record, field, value.strip() if field == "content" else value)
        await session.commit()
        await session.refresh(record)
        return _memory_response(record)

    async def delete_memory(
        self, session: AsyncSession, *, owner: str, memory_id: UUID
    ) -> None:
        record = await memory_repository.get(session, owner, memory_id)
        if record is None:
            raise _not_found("메모리")
        record.deleted_at = utc_now()
        await session.commit()

    async def list_artifacts(
        self, session: AsyncSession, *, owner: str, thread_id: UUID | None
    ) -> list[ArtifactResponse]:
        if thread_id is not None and await thread_repository.get(session, owner, thread_id) is None:
            raise _not_found("스레드")
        return [
            _artifact_response(item)
            for item in await artifact_repository.list(session, owner, thread_id)
        ]

    async def create_artifact(
        self, session: AsyncSession, *, owner: str, request: CreateArtifactRequest
    ) -> ArtifactResponse:
        thread = await thread_repository.get(session, owner, request.thread_id)
        if thread is None:
            raise _not_found("스레드")
        record = AgentArtifactRecord(
            auth_user_uuid=owner,
            thread_id=thread.id,
            langgraph_thread_id=thread.langgraph_thread_id,
            source_message_id=request.source_message_id,
            source_tool_call_id=request.source_tool_call_id,
            type=request.type,
            title=request.title,
            summary=request.summary,
            content_json=request.content,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return _artifact_response(record)

    async def get_artifact(
        self, session: AsyncSession, *, owner: str, artifact_id: UUID
    ) -> ArtifactResponse:
        record = await artifact_repository.get(session, owner, artifact_id)
        if record is None:
            raise _not_found("아티팩트")
        return _artifact_response(record)

    async def update_artifact(
        self,
        session: AsyncSession,
        *,
        owner: str,
        artifact_id: UUID,
        request: UpdateArtifactRequest,
    ) -> ArtifactResponse:
        record = await artifact_repository.get(session, owner, artifact_id)
        if record is None:
            raise _not_found("아티팩트")
        values = request.model_dump(exclude_unset=True)
        if "content" in values:
            record.content_json = values.pop("content")
            record.version += 1
        for field, value in values.items():
            setattr(record, field, value)
        await session.commit()
        await session.refresh(record)
        return _artifact_response(record)

    async def delete_artifact(
        self, session: AsyncSession, *, owner: str, artifact_id: UUID
    ) -> None:
        record = await artifact_repository.get(session, owner, artifact_id)
        if record is None:
            raise _not_found("아티팩트")
        await session.delete(record)
        await session.commit()

    async def list_documents(
        self, session: AsyncSession, owner: str
    ) -> list[DocumentResponse]:
        return [
            _document_response(item) for item in await document_repository.list(session, owner)
        ]

    async def create_document(
        self, session: AsyncSession, *, owner: str, request: CreateDocumentRequest
    ) -> DocumentResponse:
        record = AgentDocumentRecord(
            auth_user_uuid=owner,
            name=request.name,
            path=request.path,
            type=request.type,
            size_bytes=request.size_bytes,
            content_ref=request.content_ref,
            external_ref=request.external_ref,
            metadata_json=request.metadata,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        return _document_response(record)

    async def delete_document(
        self, session: AsyncSession, *, owner: str, document_id: UUID
    ) -> None:
        record = await document_repository.get(session, owner, document_id)
        if record is None:
            raise _not_found("문서")
        record.deleted_at = utc_now()
        await session.commit()

    async def attach_documents(
        self,
        session: AsyncSession,
        *,
        owner: str,
        thread_id: UUID,
        request: AttachDocumentsRequest,
    ) -> list[MessageAttachmentResponse]:
        thread = await thread_repository.get(session, owner, thread_id)
        if thread is None:
            raise _not_found("스레드")
        responses: list[MessageAttachmentResponse] = []
        for document_id in dict.fromkeys(request.document_ids):
            document = await document_repository.get(session, owner, document_id)
            if document is None:
                raise _not_found("문서")
            snapshot = _document_response(document).model_dump(mode="json")
            record = AgentMessageAttachmentRecord(
                auth_user_uuid=owner,
                thread_id=thread.id,
                langgraph_thread_id=thread.langgraph_thread_id,
                message_id=request.message_id,
                document_id=document.id,
                attached_snapshot_json=snapshot,
            )
            session.add(record)
            await session.flush()
            responses.append(
                MessageAttachmentResponse(
                    id=record.id,
                    thread_id=record.thread_id,
                    message_id=record.message_id,
                    document_id=record.document_id,
                    attached_snapshot=snapshot,
                    created_at=record.created_at,
                )
            )
        await session.commit()
        return responses

    async def upsert_feedback(
        self,
        session: AsyncSession,
        *,
        owner: str,
        message_id: str,
        request: MessageFeedbackRequest,
    ) -> MessageFeedbackResponse:
        thread = await thread_repository.get(session, owner, request.thread_id)
        if thread is None:
            raise _not_found("스레드")
        record = await feedback_repository.get(
            session, owner, request.thread_id, message_id
        )
        if record is None:
            record = AgentMessageFeedbackRecord(
                auth_user_uuid=owner,
                thread_id=thread.id,
                langgraph_thread_id=thread.langgraph_thread_id,
                message_id=message_id,
                rating=request.rating,
                comment=request.comment,
            )
            session.add(record)
        else:
            record.rating = request.rating
            record.comment = request.comment
        await session.commit()
        await session.refresh(record)
        return _feedback_response(record)

    async def get_onboarding_context(
        self, session: AsyncSession, *, owner: str, thread_id: UUID
    ) -> OnboardingContextResponse:
        if await thread_repository.get(session, owner, thread_id) is None:
            raise _not_found("스레드")
        record = await onboarding_context_repository.get(session, owner, thread_id)
        if record is None:
            raise _not_found("성향 컨텍스트")
        return _onboarding_context_response(record)

    async def set_onboarding_context(
        self,
        session: AsyncSession,
        *,
        owner: str,
        thread_id: UUID,
        request: SetOnboardingContextRequest,
    ) -> OnboardingContextResponse:
        if await thread_repository.get(session, owner, thread_id) is None:
            raise _not_found("스레드")
        record = await onboarding_context_repository.get(session, owner, thread_id)
        previous_result_code = record.result_code if record else None
        if record is None:
            record = AgentThreadOnboardingContextRecord(
                auth_user_uuid=owner,
                thread_id=thread_id,
                result_code=request.result_code,
                selected_category_code=request.selected_category_code,
                source=request.source,
            )
            session.add(record)
        else:
            record.result_code = request.result_code
            record.selected_category_code = request.selected_category_code
            record.source = request.source
            record.attached_at = utc_now()
        await onboarding_context_repository.add_event(
            session,
            owner=owner,
            thread_id=thread_id,
            previous_result_code=previous_result_code,
            next_result_code=request.result_code,
            selected_category_code=request.selected_category_code,
            source=request.source,
            summary=request.summary,
            diff=request.diff,
            tool_call_id=request.tool_call_id,
        )
        await session.commit()
        await session.refresh(record)
        return _onboarding_context_response(record)

    async def delete_onboarding_context(
        self, session: AsyncSession, *, owner: str, thread_id: UUID
    ) -> None:
        if await thread_repository.get(session, owner, thread_id) is None:
            raise _not_found("스레드")
        record = await onboarding_context_repository.get(session, owner, thread_id)
        if record is None:
            raise _not_found("성향 컨텍스트")
        await session.delete(record)
        await session.commit()


workspace_service = WorkspaceService()
