from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from agent.db.base import Base
from agent.db.models import (
    AgentArtifactRecord,
    AgentContentRecord,
    AgentDocumentRecord,
    AgentMemoryRecord,
    AgentThreadOnboardingContextRecord,
    AgentThreadRecord,
)
from agent.services.chat.system_context_state import (
    prepare_system_context_state_update,
)


class FakeOnboardingClient:
    def __init__(self, *, default_profile: dict[str, object] | None = None, fail: bool = False) -> None:
        self.default_profile = default_profile
        self.fail = fail
        self.calls = 0

    async def get_default_profile(self, access_token: str) -> dict[str, object] | None:
        self.calls += 1
        assert access_token == "token"
        if self.fail:
            raise RuntimeError("boom")
        return self.default_profile


class FakeUser(dict):
    @property
    def identity(self) -> str:
        return self["identity"]

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def display_name(self) -> str:
        return self.get("display_name", self.identity)

    @property
    def permissions(self) -> list[str]:
        return self.get("permissions", [])


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


async def _seed_workspace(
    session_factory: async_sessionmaker[AsyncSession],
) -> tuple[str, str, str]:
    async with session_factory() as session:
        thread = AgentThreadRecord(
            auth_user_uuid="user-a",
            langgraph_thread_id="langgraph-thread-1",
            title="테스트 대화",
        )
        session.add(thread)
        await session.flush()

        document_content = AgentContentRecord(
            type="commercial_report",
            title="문서 제목",
            summary="문서 요약",
            raw_text="# 문서",
        )
        artifact_content = AgentContentRecord(
            type="research_report",
            title="아티팩트 제목",
            summary="아티팩트 요약",
            raw_text="# 아티팩트",
        )
        session.add_all([document_content, artifact_content])
        await session.flush()

        artifact = AgentArtifactRecord(
            auth_user_uuid="user-a",
            thread_id=thread.id,
            langgraph_thread_id=thread.langgraph_thread_id,
            content_id=artifact_content.id,
            version=2,
        )
        session.add(artifact)
        await session.flush()

        document = AgentDocumentRecord(
            auth_user_uuid="user-a",
            content_id=document_content.id,
            source_artifact_id=artifact.id,
        )
        memory = AgentMemoryRecord(
            auth_user_uuid="user-a",
            content="메모 하나",
            source="manual",
            is_enabled=True,
        )
        onboarding_context = AgentThreadOnboardingContextRecord(
            auth_user_uuid="user-a",
            thread_id=thread.id,
            result_code="result-1",
            source="manual_attach",
        )
        session.add_all([document, memory, onboarding_context])
        await session.commit()
        return str(thread.id), str(document.id), str(artifact.id)


@pytest.mark.asyncio
async def test_prepare_system_context_state_lazy_initializes_and_overwrites_selected_resources(
    session_factory: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    """첫 run에서는 요약을 초기화하고 선택 문서·아티팩트를 현재 turn 기준으로 덮어쓴다."""

    from agent.services.chat import system_context_state as module

    thread_id, document_id, artifact_id = await _seed_workspace(session_factory)
    fake_onboarding_client = FakeOnboardingClient(default_profile={"id": "profile-1"})
    monkeypatch.setattr(module, "get_session_factory", lambda: session_factory)
    monkeypatch.setattr(module, "onboarding_service_client", fake_onboarding_client)

    result = await prepare_system_context_state_update(
        None,
        None,
        config={},
        context={
            "app_thread_id": thread_id,
            "selected_document_ids": [document_id],
            "selected_artifact_ids": [artifact_id],
        },
        server_user=FakeUser(identity="user-a", access_token="token"),
    )

    system_context = result["system_context"]
    assert system_context["selected_documents"][0]["id"] == document_id
    assert system_context["selected_artifacts"][0]["id"] == artifact_id
    assert system_context["memory_summary"] == {
        "has_memories": True,
        "memory_count": 1,
    }
    assert system_context["onboarding_summary"] == {
        "has_default_profile": True,
        "has_thread_context": True,
    }
    assert result["system_context_refresh"] == {
        "memory_summary_dirty": False,
        "onboarding_summary_dirty": False,
    }


@pytest.mark.asyncio
async def test_prepare_system_context_state_refreshes_only_dirty_summary(
    session_factory: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    """dirty flag가 켜진 summary만 다시 계산하고 나머지는 유지한다."""

    from agent.services.chat import system_context_state as module

    thread_id, _, _ = await _seed_workspace(session_factory)
    fake_onboarding_client = FakeOnboardingClient(default_profile={"id": "profile-1"})
    monkeypatch.setattr(module, "get_session_factory", lambda: session_factory)
    monkeypatch.setattr(module, "onboarding_service_client", fake_onboarding_client)

    async with session_factory() as session:
        session.add(
            AgentMemoryRecord(
                auth_user_uuid="user-a",
                content="메모 둘",
                source="manual",
                is_enabled=True,
            )
        )
        await session.commit()

    result = await prepare_system_context_state_update(
        {
            "selected_documents": [],
            "selected_artifacts": [],
            "memory_summary": {"has_memories": False, "memory_count": 0},
            "onboarding_summary": {
                "has_default_profile": False,
                "has_thread_context": False,
            },
        },
        {
            "memory_summary_dirty": True,
            "onboarding_summary_dirty": False,
        },
        config={},
        context={"app_thread_id": thread_id},
        server_user=FakeUser(identity="user-a", access_token="token"),
    )

    assert result["system_context"]["memory_summary"] == {
        "has_memories": True,
        "memory_count": 2,
    }
    assert result["system_context"]["onboarding_summary"] == {
        "has_default_profile": False,
        "has_thread_context": False,
    }
    assert fake_onboarding_client.calls == 0


@pytest.mark.asyncio
async def test_prepare_system_context_state_preserves_selected_resources_when_keys_are_absent(
    session_factory: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    """resume처럼 선택 ID key가 없으면 checkpoint의 선택 상태를 유지한다."""

    from agent.services.chat import system_context_state as module

    thread_id, _, _ = await _seed_workspace(session_factory)
    monkeypatch.setattr(module, "get_session_factory", lambda: session_factory)

    selected_documents = [
        {
            "id": "0a40bf78-783a-4a53-a94e-b6f2134df5e1",
            "type": "commercial_report",
            "title": "기존 문서",
            "summary": "기존 요약",
        }
    ]
    selected_artifacts = [
        {
            "id": "9b05d8b8-3e7e-4cd7-a02a-3068e292f89f",
            "type": "research_report",
            "title": "기존 아티팩트",
            "summary": "기존 요약",
            "version": 1,
        }
    ]

    result = await prepare_system_context_state_update(
        {
            "selected_documents": selected_documents,
            "selected_artifacts": selected_artifacts,
            "memory_summary": {"has_memories": False, "memory_count": 0},
            "onboarding_summary": None,
        },
        {
            "memory_summary_dirty": False,
            "onboarding_summary_dirty": False,
        },
        config={},
        context={"app_thread_id": thread_id},
        server_user=FakeUser(identity="user-a", access_token="token"),
    )

    assert result["system_context"]["selected_documents"] == selected_documents
    assert result["system_context"]["selected_artifacts"] == selected_artifacts


@pytest.mark.asyncio
async def test_prepare_system_context_state_rejects_invalid_selected_ids(
    session_factory: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    """선택 ID가 제공됐는데 UUID 형식이 아니면 즉시 실패한다."""

    from agent.services.chat import system_context_state as module

    thread_id, _, _ = await _seed_workspace(session_factory)
    monkeypatch.setattr(module, "get_session_factory", lambda: session_factory)

    with pytest.raises(ValueError, match="not a UUID"):
        await prepare_system_context_state_update(
            None,
            None,
            config={},
            context={
                "app_thread_id": thread_id,
                "selected_document_ids": ["not-a-uuid"],
            },
            server_user=FakeUser(identity="user-a", access_token="token"),
        )


@pytest.mark.asyncio
async def test_prepare_system_context_state_keeps_chat_running_when_onboarding_init_fails(
    session_factory: async_sessionmaker[AsyncSession], monkeypatch: pytest.MonkeyPatch
) -> None:
    """온보딩 초기화 실패는 채팅을 막지 않고 summary만 비운다."""

    from agent.services.chat import system_context_state as module

    thread_id, _, _ = await _seed_workspace(session_factory)
    fake_onboarding_client = FakeOnboardingClient(fail=True)
    monkeypatch.setattr(module, "get_session_factory", lambda: session_factory)
    monkeypatch.setattr(module, "onboarding_service_client", fake_onboarding_client)

    result = await prepare_system_context_state_update(
        None,
        None,
        config={},
        context={"app_thread_id": thread_id},
        server_user=FakeUser(identity="user-a", access_token="token"),
    )

    assert result["system_context"]["memory_summary"] == {
        "has_memories": True,
        "memory_count": 1,
    }
    assert result["system_context"]["onboarding_summary"] is None


@pytest.mark.asyncio
async def test_prepare_system_context_state_ignores_configurable_auth_user() -> None:
    """system_context 인증 사용자는 Runtime.server_info.user에서만 읽는다."""

    result = await prepare_system_context_state_update(
        None,
        None,
        config={
            "configurable": {
                "langgraph_auth_user": {
                    "identity": "user-a",
                    "access_token": "token",
                }
            }
        },
        context={},
        server_user=None,
    )

    assert result["system_context"] == {
        "selected_documents": [],
        "selected_artifacts": [],
        "memory_summary": None,
        "onboarding_summary": None,
    }
