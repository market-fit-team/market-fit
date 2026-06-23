from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, Response, status

from agent.api.deps import CurrentApiUser, DbSession
from agent.schemas.workspace import (
    AgentThreadListResponse,
    AgentThreadResponse,
    ArtifactListResponse,
    ArtifactResponse,
    AttachDocumentsRequest,
    CreateAgentThreadRequest,
    CreateArtifactRequest,
    CreateDocumentRequest,
    CreateMemoryRequest,
    DocumentListResponse,
    DocumentResponse,
    MemoryListResponse,
    MemoryResponse,
    MessageAttachmentListResponse,
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
from agent.services.workspace.service import workspace_service

router = APIRouter(prefix="/api/v1/agent")


@router.get("/threads", response_model=AgentThreadListResponse, tags=["agent-threads"])
async def list_threads(
    user: CurrentApiUser, session: DbSession
) -> AgentThreadListResponse:
    return AgentThreadListResponse(
        threads=await workspace_service.list_threads(session, user.identity)
    )


@router.post(
    "/threads",
    response_model=AgentThreadResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["agent-threads"],
)
async def create_thread(
    body: CreateAgentThreadRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> AgentThreadResponse:
    return await workspace_service.create_thread(
        session,
        owner=user.identity,
        access_token=user.access_token,
        request=body,
    )


@router.patch(
    "/threads/{thread_id}", response_model=AgentThreadResponse, tags=["agent-threads"]
)
async def update_thread(
    thread_id: UUID,
    body: UpdateAgentThreadRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> AgentThreadResponse:
    return await workspace_service.update_thread(
        session, owner=user.identity, thread_id=thread_id, request=body
    )


@router.delete(
    "/threads/{thread_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agent-threads"],
)
async def delete_thread(
    thread_id: UUID, user: CurrentApiUser, session: DbSession
) -> Response:
    await workspace_service.delete_thread(
        session, owner=user.identity, thread_id=thread_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/threads/{thread_id}/settings",
    response_model=ThreadSettingsResponse,
    tags=["agent-threads"],
)
async def get_thread_settings(
    thread_id: UUID, user: CurrentApiUser, session: DbSession
) -> ThreadSettingsResponse:
    return await workspace_service.get_settings(
        session, owner=user.identity, thread_id=thread_id
    )


@router.put(
    "/threads/{thread_id}/settings",
    response_model=ThreadSettingsResponse,
    tags=["agent-threads"],
)
async def update_thread_settings(
    thread_id: UUID,
    body: UpdateThreadSettingsRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> ThreadSettingsResponse:
    return await workspace_service.update_settings(
        session, owner=user.identity, thread_id=thread_id, request=body
    )


@router.get("/memories", response_model=MemoryListResponse, tags=["agent-memories"])
async def list_memories(
    user: CurrentApiUser, session: DbSession
) -> MemoryListResponse:
    return MemoryListResponse(
        memories=await workspace_service.list_memories(session, user.identity)
    )


@router.post(
    "/memories",
    response_model=MemoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["agent-memories"],
)
async def create_memory(
    body: CreateMemoryRequest, user: CurrentApiUser, session: DbSession
) -> MemoryResponse:
    return await workspace_service.create_memory(
        session, owner=user.identity, request=body
    )


@router.patch(
    "/memories/{memory_id}", response_model=MemoryResponse, tags=["agent-memories"]
)
async def update_memory(
    memory_id: UUID,
    body: UpdateMemoryRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> MemoryResponse:
    return await workspace_service.update_memory(
        session, owner=user.identity, memory_id=memory_id, request=body
    )


@router.delete(
    "/memories/{memory_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agent-memories"],
)
async def delete_memory(
    memory_id: UUID, user: CurrentApiUser, session: DbSession
) -> Response:
    await workspace_service.delete_memory(
        session, owner=user.identity, memory_id=memory_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/artifacts", response_model=ArtifactListResponse, tags=["agent-artifacts"])
async def list_artifacts(
    user: CurrentApiUser,
    session: DbSession,
    thread_id: UUID | None = Query(default=None),
) -> ArtifactListResponse:
    return ArtifactListResponse(
        artifacts=await workspace_service.list_artifacts(
            session, owner=user.identity, thread_id=thread_id
        )
    )


@router.post(
    "/artifacts",
    response_model=ArtifactResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["agent-artifacts"],
)
async def create_artifact(
    body: CreateArtifactRequest, user: CurrentApiUser, session: DbSession
) -> ArtifactResponse:
    return await workspace_service.create_artifact(
        session, owner=user.identity, request=body
    )


@router.get(
    "/artifacts/{artifact_id}",
    response_model=ArtifactResponse,
    tags=["agent-artifacts"],
)
async def get_artifact(
    artifact_id: UUID, user: CurrentApiUser, session: DbSession
) -> ArtifactResponse:
    return await workspace_service.get_artifact(
        session, owner=user.identity, artifact_id=artifact_id
    )


@router.patch(
    "/artifacts/{artifact_id}",
    response_model=ArtifactResponse,
    tags=["agent-artifacts"],
)
async def update_artifact(
    artifact_id: UUID,
    body: UpdateArtifactRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> ArtifactResponse:
    return await workspace_service.update_artifact(
        session, owner=user.identity, artifact_id=artifact_id, request=body
    )


@router.delete(
    "/artifacts/{artifact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agent-artifacts"],
)
async def delete_artifact(
    artifact_id: UUID, user: CurrentApiUser, session: DbSession
) -> Response:
    await workspace_service.delete_artifact(
        session, owner=user.identity, artifact_id=artifact_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/documents", response_model=DocumentListResponse, tags=["agent-documents"])
async def list_documents(
    user: CurrentApiUser, session: DbSession
) -> DocumentListResponse:
    return DocumentListResponse(
        documents=await workspace_service.list_documents(session, user.identity)
    )


@router.post(
    "/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["agent-documents"],
)
async def create_document(
    body: CreateDocumentRequest, user: CurrentApiUser, session: DbSession
) -> DocumentResponse:
    return await workspace_service.create_document(
        session, owner=user.identity, request=body
    )


@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agent-documents"],
)
async def delete_document(
    document_id: UUID, user: CurrentApiUser, session: DbSession
) -> Response:
    await workspace_service.delete_document(
        session, owner=user.identity, document_id=document_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/threads/{thread_id}/attachments",
    response_model=MessageAttachmentListResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["agent-documents"],
)
async def attach_documents(
    thread_id: UUID,
    body: AttachDocumentsRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> MessageAttachmentListResponse:
    return MessageAttachmentListResponse(
        attachments=await workspace_service.attach_documents(
            session, owner=user.identity, thread_id=thread_id, request=body
        )
    )


@router.post(
    "/messages/{message_id}/feedback",
    response_model=MessageFeedbackResponse,
    tags=["agent-feedback"],
)
async def upsert_message_feedback(
    message_id: str,
    body: MessageFeedbackRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> MessageFeedbackResponse:
    return await workspace_service.upsert_feedback(
        session, owner=user.identity, message_id=message_id, request=body
    )


@router.get(
    "/threads/{thread_id}/onboarding-context",
    response_model=OnboardingContextResponse,
    tags=["agent-onboarding-context"],
)
async def get_onboarding_context(
    thread_id: UUID, user: CurrentApiUser, session: DbSession
) -> OnboardingContextResponse:
    return await workspace_service.get_onboarding_context(
        session, owner=user.identity, thread_id=thread_id
    )


@router.put(
    "/threads/{thread_id}/onboarding-context",
    response_model=OnboardingContextResponse,
    tags=["agent-onboarding-context"],
)
async def set_onboarding_context(
    thread_id: UUID,
    body: SetOnboardingContextRequest,
    user: CurrentApiUser,
    session: DbSession,
) -> OnboardingContextResponse:
    return await workspace_service.set_onboarding_context(
        session, owner=user.identity, thread_id=thread_id, request=body
    )


@router.delete(
    "/threads/{thread_id}/onboarding-context",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["agent-onboarding-context"],
)
async def delete_onboarding_context(
    thread_id: UUID, user: CurrentApiUser, session: DbSession
) -> Response:
    await workspace_service.delete_onboarding_context(
        session, owner=user.identity, thread_id=thread_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
