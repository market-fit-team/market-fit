from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from langchain_core.tools import tool
from langgraph.prebuilt import ToolRuntime

from agent.db.models import AgentArtifactRecord
from agent.db.session import get_session_factory
from agent.repositories.workspace import artifact_repository, thread_repository
from agent.services.chat.approvals.schemas import ApprovalDecisionType
from agent.services.chat.tools import ChatToolError
from agent.services.chat.tools.runtime_user import require_app_thread_id, require_runtime_user
from agent.services.chat.tools.tool_spec import ToolSpec

DECISIONS: list[ApprovalDecisionType] = ["approve", "edit", "reject", "respond"]


def _uuid(value: str, label: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as exc:
        raise ChatToolError(f"{label} ID 형식이 올바르지 않습니다.") from exc


@tool
async def artifact_get(artifact_id: str, runtime: ToolRuntime) -> dict[str, Any]:
    """현재 사용자가 소유한 저장 아티팩트를 조회합니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await artifact_repository.get(session, owner, _uuid(artifact_id, "아티팩트"))
    if record is None:
        raise ChatToolError("아티팩트를 찾을 수 없습니다.")
    return {
        "id": str(record.id),
        "thread_id": str(record.thread_id),
        "type": record.type,
        "title": record.title,
        "summary": record.summary,
        "version": record.version,
        "content": record.content_json,
    }


@tool
async def artifact_create(
    artifact_type: Literal[
        "ai_report",
        "code",
        "markdown",
        "search_report",
        "personality_analysis_ref",
    ],
    title: str,
    content: dict[str, Any],
    runtime: ToolRuntime,
    summary: str | None = None,
) -> dict[str, Any]:
    """대화에서 만든 결과를 사용자 승인 뒤 아티팩트로 저장합니다."""

    owner, _ = require_runtime_user(runtime)
    app_thread_id = require_app_thread_id(runtime)
    async with get_session_factory()() as session:
        thread = await thread_repository.get(session, owner, app_thread_id)
        if thread is None:
            raise ChatToolError("아티팩트를 저장할 스레드를 찾을 수 없습니다.")
        record = AgentArtifactRecord(
            auth_user_uuid=owner,
            thread_id=thread.id,
            langgraph_thread_id=thread.langgraph_thread_id,
            type=artifact_type,
            title=title.strip(),
            summary=summary,
            content_json=content,
            source_tool_call_id=runtime.tool_call_id,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
    return {
        "id": str(record.id),
        "thread_id": str(record.thread_id),
        "type": record.type,
        "title": record.title,
        "summary": record.summary,
        "version": record.version,
        "content": record.content_json,
    }


@tool
async def artifact_update(
    artifact_id: str,
    content: dict[str, Any],
    runtime: ToolRuntime,
    title: str | None = None,
    summary: str | None = None,
) -> dict[str, Any]:
    """저장된 아티팩트 본문을 사용자 승인 뒤 새 버전으로 갱신합니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await artifact_repository.get(
            session, owner, _uuid(artifact_id, "아티팩트")
        )
        if record is None:
            raise ChatToolError("수정할 아티팩트를 찾을 수 없습니다.")
        record.content_json = content
        record.version += 1
        if title is not None:
            record.title = title.strip()
        if summary is not None:
            record.summary = summary
        await session.commit()
        await session.refresh(record)
    return {
        "id": str(record.id),
        "type": record.type,
        "title": record.title,
        "summary": record.summary,
        "version": record.version,
        "content": record.content_json,
    }


@tool
async def artifact_delete(artifact_id: str, runtime: ToolRuntime) -> dict[str, str]:
    """저장된 아티팩트를 사용자 승인 뒤 삭제합니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await artifact_repository.get(
            session, owner, _uuid(artifact_id, "아티팩트")
        )
        if record is None:
            raise ChatToolError("삭제할 아티팩트를 찾을 수 없습니다.")
        await session.delete(record)
        await session.commit()
    return {"id": artifact_id, "status": "deleted"}


ARTIFACT_TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        tool=artifact_get,
        name="artifact_get",
        description="현재 사용자가 저장한 아티팩트 하나를 조회합니다.",
        category="document",
        args_schema=artifact_get.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=artifact_create,
        name="artifact_create",
        description="사용자 승인 뒤 대화 결과를 아티팩트로 저장합니다.",
        category="document",
        args_schema=artifact_create.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=artifact_update,
        name="artifact_update",
        description="사용자 승인 뒤 저장된 아티팩트의 버전을 갱신합니다.",
        category="document",
        args_schema=artifact_update.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=artifact_delete,
        name="artifact_delete",
        description="사용자 승인 뒤 저장된 아티팩트를 삭제합니다.",
        category="document",
        args_schema=artifact_delete.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
)
