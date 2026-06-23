from __future__ import annotations

from collections.abc import AsyncIterator
import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from agent.db.base import Base
from agent.schemas.workspace import (
    CreateAgentThreadRequest,
    CreateArtifactRequest,
    CreateMemoryRequest,
    MessageFeedbackRequest,
    SetOnboardingContextRequest,
    UpdateAgentThreadRequest,
    UpdateArtifactRequest,
)
from agent.services.workspace.service import WorkspaceService


class FakeAgentServerClient:
    def __init__(self) -> None:
        self.created_for: list[str] = []

    async def create_thread(self, *, access_token: str, owner: str) -> str:
        assert access_token == "token"
        self.created_for.append(owner)
        return f"langgraph-{owner}-{len(self.created_for)}"


@pytest.fixture
async def session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as db_session:
        yield db_session
    await engine.dispose()


@pytest.fixture
def service() -> WorkspaceService:
    return WorkspaceService(FakeAgentServerClient())


async def _create_thread(
    service: WorkspaceService, session: AsyncSession, owner: str
):
    return await service.create_thread(
        session,
        owner=owner,
        access_token="token",
        request=CreateAgentThreadRequest(title="테스트 대화"),
    )


async def test_thread_crud_is_scoped_by_owner(
    service: WorkspaceService, session: AsyncSession
) -> None:
    """다른 사용자는 스레드 수정과 삭제를 할 수 없다."""

    thread = await _create_thread(service, session, "user-a")

    with pytest.raises(HTTPException) as exc_info:
        await service.update_thread(
            session,
            owner="user-b",
            thread_id=thread.id,
            request=UpdateAgentThreadRequest(title="침범"),
        )

    assert exc_info.value.status_code == 404
    own_threads = await service.list_threads(session, "user-a")
    other_threads = await service.list_threads(session, "user-b")
    assert [item.id for item in own_threads] == [thread.id]
    assert other_threads == []


async def test_memory_soft_delete_hides_record(
    service: WorkspaceService, session: AsyncSession
) -> None:
    """삭제한 메모리는 사용자 목록에서 즉시 제외된다."""

    memory = await service.create_memory(
        session,
        owner="user-a",
        request=CreateMemoryRequest(content="주말 상권을 선호한다."),
    )
    await service.delete_memory(session, owner="user-a", memory_id=memory.id)

    assert await service.list_memories(session, "user-a") == []


async def test_artifact_update_increments_version_only_for_content(
    service: WorkspaceService, session: AsyncSession
) -> None:
    """아티팩트 본문 변경만 새 버전으로 계산한다."""

    thread = await _create_thread(service, session, "user-a")
    artifact = await service.create_artifact(
        session,
        owner="user-a",
        request=CreateArtifactRequest(
            thread_id=thread.id,
            type="ai_report",
            title="상권 리포트",
            content={"blocks": []},
        ),
    )
    renamed = await service.update_artifact(
        session,
        owner="user-a",
        artifact_id=artifact.id,
        request=UpdateArtifactRequest(title="수정된 리포트"),
    )
    revised = await service.update_artifact(
        session,
        owner="user-a",
        artifact_id=artifact.id,
        request=UpdateArtifactRequest(content={"blocks": [{"kind": "markdown"}]}),
    )

    assert renamed.version == 1
    assert revised.version == 2


async def test_feedback_is_upserted_per_message(
    service: WorkspaceService, session: AsyncSession
) -> None:
    """같은 메시지의 피드백은 중복 row 대신 최신 평가로 갱신된다."""

    thread = await _create_thread(service, session, "user-a")
    first = await service.upsert_feedback(
        session,
        owner="user-a",
        message_id="message-1",
        request=MessageFeedbackRequest(thread_id=thread.id, rating="like"),
    )
    second = await service.upsert_feedback(
        session,
        owner="user-a",
        message_id="message-1",
        request=MessageFeedbackRequest(
            thread_id=thread.id, rating="dislike", comment="근거가 부족하다."
        ),
    )

    assert first.id == second.id
    assert second.rating == "dislike"
    assert second.comment == "근거가 부족하다."


async def test_onboarding_context_replaces_result_code_and_keeps_owner_boundary(
    service: WorkspaceService, session: AsyncSession
) -> None:
    """스레드 성향 코드는 교체할 수 있고 다른 사용자는 읽을 수 없다."""

    thread = await _create_thread(service, session, "user-a")
    await service.set_onboarding_context(
        session,
        owner="user-a",
        thread_id=thread.id,
        request=SetOnboardingContextRequest(result_code="result-a"),
    )
    updated = await service.set_onboarding_context(
        session,
        owner="user-a",
        thread_id=thread.id,
        request=SetOnboardingContextRequest(
            result_code="result-b", source="agent_update", diff={"budget_level": 0.7}
        ),
    )

    assert updated.result_code == "result-b"
    with pytest.raises(HTTPException) as exc_info:
        await service.get_onboarding_context(
            session, owner="user-b", thread_id=thread.id
        )
    assert exc_info.value.status_code == 404
