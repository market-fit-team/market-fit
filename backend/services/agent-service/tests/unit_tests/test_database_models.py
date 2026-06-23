from agent.db.base import Base
from agent.db import models as _models  # noqa: F401


def test_workspace_tables_are_registered() -> None:
    """워크스페이스 영속화에 필요한 테이블이 모두 메타데이터에 등록된다."""

    expected = {
        "agent_threads",
        "agent_thread_settings",
        "agent_user_preferences",
        "agent_memories",
        "agent_thread_onboarding_contexts",
        "agent_onboarding_context_events",
        "agent_artifacts",
        "agent_documents",
        "agent_message_attachments",
        "agent_message_feedback",
        "agent_hitl_events",
    }

    assert expected <= set(Base.metadata.tables)


def test_owner_columns_are_indexed_for_user_scoped_resources() -> None:
    """사용자별 목록을 읽는 주요 테이블은 소유자 인덱스를 가진다."""

    for table_name in (
        "agent_threads",
        "agent_memories",
        "agent_artifacts",
        "agent_documents",
    ):
        table = Base.metadata.tables[table_name]
        indexed_columns = {
            column.name
            for index in table.indexes
            for column in index.columns
        }
        assert "auth_user_uuid" in indexed_columns
