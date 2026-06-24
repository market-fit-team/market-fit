from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from uuid import UUID

from langchain_core.runnables import RunnableConfig
from langgraph.runtime import BaseUser

from agent.clients.onboarding_service import onboarding_service_client
from agent.db.session import get_session_factory
from agent.repositories.workspace import (
    artifact_repository,
    content_repository,
    document_repository,
    memory_repository,
    onboarding_context_repository,
)
from agent.services.chat.context import ChatRuntimeContext
from agent.services.chat.state import (
    MemorySummary,
    OnboardingSummary,
    SelectedArtifactContextState,
    SelectedDocumentContextState,
    SystemContextRefreshState,
    SystemContextState,
)
from agent.services.chat.tools.runtime_user import (
    extract_runtime_value,
)


def empty_system_context_state() -> SystemContextState:
    return {
        "selected_documents": [],
        "selected_artifacts": [],
        "memory_summary": None,
        "onboarding_summary": None,
    }


def clean_system_context_refresh_state() -> SystemContextRefreshState:
    return {
        "memory_summary_dirty": False,
        "onboarding_summary_dirty": False,
    }


def parse_selected_ids(raw_ids: object) -> list[UUID]:
    """실행 컨텍스트의 선택 ID 목록을 UUID list로 검증한다."""

    if not isinstance(raw_ids, list):
        raise ValueError("selected ids must be a list")
    resolved_ids: list[UUID] = []
    for raw_id in raw_ids:
        if not isinstance(raw_id, str):
            raise ValueError("selected id must be a string")
        try:
            resolved_ids.append(UUID(raw_id))
        except ValueError:
            raise ValueError(f"selected id is not a UUID: {raw_id}") from None
    return resolved_ids


def _runtime_context_mapping(
    context: ChatRuntimeContext | None,
) -> Mapping[str, Any] | None:
    return context if isinstance(context, Mapping) else None


def _runtime_context_value(
    config: RunnableConfig,
    context: ChatRuntimeContext | None,
    key: str,
) -> Any:
    return extract_runtime_value(config, _runtime_context_mapping(context), key)


def extract_authenticated_user_identity(server_user: BaseUser | None) -> str | None:
    """LangGraph Server가 Runtime.server_info.user에 주입한 사용자 식별자를 읽는다.

    config.configurable.langgraph_auth_user는 서버 내부 worker 전달 구현 세부사항이므로
    애플리케이션 노드에서는 Runtime.server_info.user만 인증 사용자 경로로 사용한다.
    https://docs.langchain.com/oss/python/langchain/tools#server-info
    """

    if server_user is None:
        return None
    identity = server_user.identity
    return identity if isinstance(identity, str) and identity else None


def extract_authenticated_user_access_token(server_user: BaseUser | None) -> str | None:
    """LangGraph Server 인증 사용자에 실어 보낸 액세스 토큰을 읽는다.

    onboarding-service 같은 사용자 위임 호출은 authenticate 반환값에 포함된
    access_token을 그대로 사용한다.
    """

    if server_user is None or "access_token" not in server_user:
        return None
    access_token = server_user["access_token"]
    return access_token if isinstance(access_token, str) and access_token else None


def extract_app_thread_id(
    context: ChatRuntimeContext | None, config: RunnableConfig | None = None
) -> UUID | None:
    raw_thread_id = (
        _runtime_context_value(config, context, "app_thread_id")
        if config is not None
        else (context or {}).get("app_thread_id")
    )
    if not isinstance(raw_thread_id, str):
        return None
    try:
        return UUID(raw_thread_id)
    except ValueError:
        return None


def _runtime_configurable_mapping(config: RunnableConfig) -> Mapping[str, Any] | None:
    configurable = config.get("configurable", {})
    return configurable if isinstance(configurable, Mapping) else None


def _has_runtime_value(
    config: RunnableConfig,
    context: ChatRuntimeContext | None,
    key: str,
) -> bool:
    context_mapping = _runtime_context_mapping(context)
    if context_mapping is not None and key in context_mapping:
        return True

    configurable = _runtime_configurable_mapping(config)
    return configurable is not None and key in configurable


async def _build_selected_document_states(
    owner: str | None,
    *,
    raw_ids: object,
) -> list[SelectedDocumentContextState]:
    if owner is None:
        raise ValueError("authenticated user is required for selected documents")
    selected_document_ids = parse_selected_ids(raw_ids)
    if not selected_document_ids:
        return []

    async with get_session_factory()() as session:
        document_records = await document_repository.list_by_ids(
            session, owner, selected_document_ids
        )
        contents = {
            content.id: content
            for content in await content_repository.list_by_ids(
                session, [record.content_id for record in document_records]
            )
        }

    found_ids = {record.id for record in document_records}
    missing_ids = set(selected_document_ids) - found_ids
    if missing_ids:
        raise ValueError("selected documents must belong to the authenticated user")

    return [
        {
            "id": str(record.id),
            "type": content.type,
            "title": content.title,
            "summary": content.summary,
        }
        for record in document_records
        if (content := contents.get(record.content_id)) is not None
    ]


async def _build_selected_artifact_states(
    owner: str | None,
    *,
    raw_ids: object,
) -> list[SelectedArtifactContextState]:
    if owner is None:
        raise ValueError("authenticated user is required for selected artifacts")
    selected_artifact_ids = parse_selected_ids(raw_ids)
    if not selected_artifact_ids:
        return []

    async with get_session_factory()() as session:
        artifact_records = await artifact_repository.list_by_ids(
            session, owner, selected_artifact_ids
        )
        contents = {
            content.id: content
            for content in await content_repository.list_by_ids(
                session, [record.content_id for record in artifact_records]
            )
        }

    found_ids = {record.id for record in artifact_records}
    missing_ids = set(selected_artifact_ids) - found_ids
    if missing_ids:
        raise ValueError("selected artifacts must belong to the authenticated user")

    return [
        {
            "id": str(record.id),
            "type": content.type,
            "title": content.title,
            "summary": content.summary,
            "version": record.version,
        }
        for record in artifact_records
        if (content := contents.get(record.content_id)) is not None
    ]


async def _build_memory_summary(owner: str | None) -> MemorySummary | None:
    if owner is None:
        return None
    async with get_session_factory()() as session:
        memory_count = await memory_repository.count_enabled(session, owner)
    return {
        "has_memories": memory_count > 0,
        "memory_count": memory_count,
    }


async def _build_onboarding_summary(
    owner: str | None,
    *,
    access_token: str | None,
    app_thread_id: UUID | None,
) -> OnboardingSummary | None:
    if owner is None or access_token is None:
        return None

    has_thread_context = False
    if app_thread_id is not None:
        async with get_session_factory()() as session:
            has_thread_context = (
                await onboarding_context_repository.get(session, owner, app_thread_id)
            ) is not None

    try:
        default_profile = await onboarding_service_client.get_default_profile(access_token)
    except Exception:
        return None

    return {
        "has_default_profile": default_profile is not None,
        "has_thread_context": has_thread_context,
    }


async def prepare_system_context_state_update(
    current_system_context: SystemContextState | None,
    current_refresh: SystemContextRefreshState | None,
    *,
    config: RunnableConfig,
    context: ChatRuntimeContext | None,
    server_user: BaseUser | None = None,
) -> dict[str, Any]:
    owner = extract_authenticated_user_identity(server_user)
    access_token = extract_authenticated_user_access_token(server_user)
    app_thread_id = extract_app_thread_id(context, config)

    system_context = (
        {
            "selected_documents": list(current_system_context["selected_documents"]),
            "selected_artifacts": list(current_system_context["selected_artifacts"]),
            "memory_summary": current_system_context["memory_summary"],
            "onboarding_summary": current_system_context["onboarding_summary"],
        }
        if current_system_context is not None
        else empty_system_context_state()
    )
    refresh_state = (
        {
            "memory_summary_dirty": current_refresh["memory_summary_dirty"],
            "onboarding_summary_dirty": current_refresh["onboarding_summary_dirty"],
        }
        if current_refresh is not None
        else clean_system_context_refresh_state()
    )

    if _has_runtime_value(config, context, "selected_document_ids"):
        system_context["selected_documents"] = await _build_selected_document_states(
            owner,
            raw_ids=_runtime_context_value(config, context, "selected_document_ids"),
        )
    if _has_runtime_value(config, context, "selected_artifact_ids"):
        system_context["selected_artifacts"] = await _build_selected_artifact_states(
            owner,
            raw_ids=_runtime_context_value(config, context, "selected_artifact_ids"),
        )

    if current_system_context is None or refresh_state["memory_summary_dirty"]:
        system_context["memory_summary"] = await _build_memory_summary(owner)
        refresh_state["memory_summary_dirty"] = False

    if current_system_context is None or refresh_state["onboarding_summary_dirty"]:
        system_context["onboarding_summary"] = await _build_onboarding_summary(
            owner,
            access_token=access_token,
            app_thread_id=app_thread_id,
        )
        refresh_state["onboarding_summary_dirty"] = False

    return {
        "system_context": system_context,
        "system_context_refresh": refresh_state,
    }
