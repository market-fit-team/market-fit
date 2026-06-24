from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from agent.clients.agent_server import ThreadCreator, agent_server_client
from agent.db.models import (
    AgentArtifactRecord,
    AgentContentRecord,
    AgentDocumentRecord,
    AgentMemoryRecord,
    AgentMessageFeedbackRecord,
    AgentThreadOnboardingContextRecord,
)
from agent.repositories.workspace import (
    artifact_repository,
    content_repository,
    document_repository,
    feedback_repository,
    memory_repository,
    onboarding_context_repository,
    thread_repository,
    thread_settings_repository,
    utc_now,
)
from agent.services.chat.approvals.policy import (
    default_allowed_tools,
    default_interrupt_on_config,
)
from agent.services.chat.model_cards import list_chat_model_cards
from agent.schemas.workspace import (
    AgentThreadResponse,
    ArtifactResponse,
    CreateAgentThreadRequest,
    CreateArtifactRequest,
    CreateDocumentRequest,
    CreateMemoryRequest,
    DocumentResponse,
    MemoryResponse,
    MessageFeedbackRequest,
    MessageFeedbackResponse,
    OnboardingContextResponse,
    SetOnboardingContextRequest,
    ThreadSettingsResponse,
    UpdateAgentThreadRequest,
    UpdateArtifactRequest,
    UpdateDocumentRequest,
    UpdateMemoryRequest,
    UpdateThreadSettingsRequest,
)


def _default_model_settings() -> tuple[str, str]:
    cards = list_chat_model_cards()
    if not cards:
        raise RuntimeError("chat model catalog is empty")
    default_card = cards[0]
    return default_card.id, default_card.default_reasoning_effort


def _not_found(resource: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource}을 찾을 수 없습니다.")


def _thread_response(record: Any) -> AgentThreadResponse:
    return AgentThreadResponse.model_validate(record)


def _settings_response(record: Any) -> ThreadSettingsResponse:
    if record.model is None or record.reasoning_effort is None:
        raise RuntimeError("thread settings must have model and reasoning_effort")
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


def _normalize_raw_text(raw_text: str) -> str:
    normalized = raw_text.strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="본문은 비어 있을 수 없습니다.",
        )
    return normalized


def _artifact_response(record: AgentArtifactRecord, content: AgentContentRecord) -> ArtifactResponse:
    return ArtifactResponse(
        id=record.id,
        thread_id=record.thread_id,
        langgraph_thread_id=record.langgraph_thread_id,
        source_message_id=record.source_message_id,
        source_tool_call_id=record.source_tool_call_id,
        type=content.type,
        title=content.title,
        summary=content.summary,
        raw_text=content.raw_text,
        version=record.version,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _document_response(record: AgentDocumentRecord, content: AgentContentRecord) -> DocumentResponse:
    return DocumentResponse(
        id=record.id,
        type=content.type,
        title=content.title,
        summary=content.summary,
        raw_text=content.raw_text,
        source_artifact_id=record.source_artifact_id,
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

    async def _create_default_settings(
        self,
        session: AsyncSession,
        *,
        owner: str,
        thread_id: UUID,
    ) -> Any:
        default_model, default_reasoning_effort = _default_model_settings()
        preferences = await thread_settings_repository.get_preferences(session, owner)
        allowed_tools = (
            list(preferences.default_allowed_tools_json)
            if preferences and preferences.default_allowed_tools_json
            else default_allowed_tools()
        )
        interrupt_on = (
            dict(preferences.default_interrupt_on_json)
            if preferences and preferences.default_interrupt_on_json
            else default_interrupt_on_config(allowed_tools)
        )
        return await thread_settings_repository.create(
            session,
            thread_id=thread_id,
            model=preferences.default_model if preferences and preferences.default_model else default_model,
            reasoning_effort=(
                preferences.default_reasoning_effort
                if preferences and preferences.default_reasoning_effort
                else default_reasoning_effort
            ),
            allowed_tools=allowed_tools,
            interrupt_on=interrupt_on,
        )

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
        await self._create_default_settings(session, owner=owner, thread_id=record.id)
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
            record = await self._create_default_settings(
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
            record = await self._create_default_settings(
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
        records = await artifact_repository.list(session, owner, thread_id)
        contents = {
            content.id: content
            for content in await content_repository.list_by_ids(
                session, [record.content_id for record in records]
            )
        }
        return [
            _artifact_response(record, content)
            for record in records
            if (content := contents.get(record.content_id)) is not None
        ]

    async def create_artifact(
        self, session: AsyncSession, *, owner: str, request: CreateArtifactRequest
    ) -> ArtifactResponse:
        thread = await thread_repository.get(session, owner, request.thread_id)
        if thread is None:
            raise _not_found("스레드")
        content = AgentContentRecord(
            type=request.type,
            title=request.title,
            summary=request.summary,
            raw_text=_normalize_raw_text(request.raw_text),
        )
        session.add(content)
        await session.flush()
        record = AgentArtifactRecord(
            auth_user_uuid=owner,
            thread_id=thread.id,
            langgraph_thread_id=thread.langgraph_thread_id,
            source_message_id=request.source_message_id,
            source_tool_call_id=request.source_tool_call_id,
            content_id=content.id,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        await session.refresh(content)
        return _artifact_response(record, content)

    async def get_artifact(
        self, session: AsyncSession, *, owner: str, artifact_id: UUID
    ) -> ArtifactResponse:
        record = await artifact_repository.get(session, owner, artifact_id)
        if record is None:
            raise _not_found("아티팩트")
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise _not_found("아티팩트 본문")
        return _artifact_response(record, content)

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
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise _not_found("아티팩트 본문")
        values = request.model_dump(exclude_unset=True)
        if "title" in values:
            content.title = values["title"]
        if "summary" in values:
            content.summary = values["summary"]
        if "raw_text" in values:
            normalized_raw_text = _normalize_raw_text(values["raw_text"])
            if normalized_raw_text != content.raw_text:
                content.raw_text = normalized_raw_text
                record.version += 1
        await session.commit()
        await session.refresh(record)
        await session.refresh(content)
        return _artifact_response(record, content)

    async def save_artifact_as_document(
        self, session: AsyncSession, *, owner: str, artifact_id: UUID
    ) -> DocumentResponse:
        artifact = await artifact_repository.get(session, owner, artifact_id)
        if artifact is None:
            raise _not_found("아티팩트")
        artifact_content = await content_repository.get(session, artifact.content_id)
        if artifact_content is None:
            raise _not_found("아티팩트 본문")
        copied_content = AgentContentRecord(
            type=artifact_content.type,
            title=artifact_content.title,
            summary=artifact_content.summary,
            raw_text=artifact_content.raw_text,
        )
        session.add(copied_content)
        await session.flush()
        document = AgentDocumentRecord(
            auth_user_uuid=owner,
            content_id=copied_content.id,
            source_artifact_id=artifact.id,
        )
        session.add(document)
        await session.commit()
        await session.refresh(document)
        await session.refresh(copied_content)
        return _document_response(document, copied_content)

    async def list_documents(
        self, session: AsyncSession, owner: str
    ) -> list[DocumentResponse]:
        records = await document_repository.list(session, owner)
        contents = {
            content.id: content
            for content in await content_repository.list_by_ids(
                session, [record.content_id for record in records]
            )
        }
        return [
            _document_response(record, content)
            for record in records
            if (content := contents.get(record.content_id)) is not None
        ]

    async def create_document(
        self, session: AsyncSession, *, owner: str, request: CreateDocumentRequest
    ) -> DocumentResponse:
        if request.source_artifact_id is not None:
            source_artifact = await artifact_repository.get(
                session, owner, request.source_artifact_id
            )
            if source_artifact is None:
                raise _not_found("원본 아티팩트")
        content = AgentContentRecord(
            type=request.type,
            title=request.title,
            summary=request.summary,
            raw_text=_normalize_raw_text(request.raw_text),
        )
        session.add(content)
        await session.flush()
        record = AgentDocumentRecord(
            auth_user_uuid=owner,
            content_id=content.id,
            source_artifact_id=request.source_artifact_id,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        await session.refresh(content)
        return _document_response(record, content)

    async def get_document(
        self, session: AsyncSession, *, owner: str, document_id: UUID
    ) -> DocumentResponse:
        record = await document_repository.get(session, owner, document_id)
        if record is None:
            raise _not_found("문서")
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise _not_found("문서 본문")
        return _document_response(record, content)

    async def update_document(
        self,
        session: AsyncSession,
        *,
        owner: str,
        document_id: UUID,
        request: UpdateDocumentRequest,
    ) -> DocumentResponse:
        record = await document_repository.get(session, owner, document_id)
        if record is None:
            raise _not_found("문서")
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise _not_found("문서 본문")
        values = request.model_dump(exclude_unset=True)
        if "title" in values:
            content.title = values["title"]
        if "summary" in values:
            content.summary = values["summary"]
        if "raw_text" in values:
            content.raw_text = _normalize_raw_text(values["raw_text"])
        await session.commit()
        await session.refresh(record)
        await session.refresh(content)
        return _document_response(record, content)

    async def delete_document(
        self, session: AsyncSession, *, owner: str, document_id: UUID
    ) -> None:
        record = await document_repository.get(session, owner, document_id)
        if record is None:
            raise _not_found("문서")
        record.deleted_at = utc_now()
        await session.commit()

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
