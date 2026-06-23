from __future__ import annotations

from uuid import UUID

from langchain_core.tools import tool
from langgraph.prebuilt import ToolRuntime

from agent.db.models import AgentMemoryRecord
from agent.db.session import get_session_factory
from agent.repositories.workspace import memory_repository, utc_now
from agent.services.chat.approvals.schemas import ApprovalDecisionType
from agent.services.chat.tools import ChatToolError
from agent.services.chat.tools.runtime_user import require_runtime_user
from agent.services.chat.tools.tool_spec import ToolSpec

DECISIONS: list[ApprovalDecisionType] = ["approve", "edit", "reject", "respond"]


@tool
async def memory_search(
    query: str,
    runtime: ToolRuntime,
    limit: int = 5,
) -> list[dict[str, str]]:
    """현재 사용자의 활성 장기 메모리를 검색합니다."""

    owner, _ = require_runtime_user(runtime)
    normalized_query = query.strip().casefold()
    async with get_session_factory()() as session:
        records = await memory_repository.list(
            session, owner, enabled_only=True, limit=max(1, min(limit * 4, 40))
        )
    matched = [
        record
        for record in records
        if not normalized_query or normalized_query in record.content.casefold()
    ]
    selected = (matched or records)[: max(1, min(limit, 10))]
    return [
        {"id": str(record.id), "content": record.content, "source": record.source}
        for record in selected
    ]


@tool
async def memory_create(content: str, runtime: ToolRuntime) -> dict[str, str]:
    """현재 사용자의 장기 메모리를 새로 저장합니다."""

    owner, _ = require_runtime_user(runtime)
    normalized = content.strip()
    if not normalized:
        raise ChatToolError("저장할 메모리 내용이 비어 있습니다.")
    async with get_session_factory()() as session:
        record = AgentMemoryRecord(
            auth_user_uuid=owner, content=normalized, source="agent_inferred"
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
    return {"id": str(record.id), "content": record.content, "source": record.source}


@tool
async def memory_update(
    memory_id: str, content: str, runtime: ToolRuntime
) -> dict[str, str]:
    """현재 사용자의 장기 메모리 내용을 수정합니다."""

    owner, _ = require_runtime_user(runtime)
    try:
        resolved_id = UUID(memory_id)
    except ValueError as exc:
        raise ChatToolError("메모리 ID 형식이 올바르지 않습니다.") from exc
    normalized = content.strip()
    if not normalized:
        raise ChatToolError("수정할 메모리 내용이 비어 있습니다.")
    async with get_session_factory()() as session:
        record = await memory_repository.get(session, owner, resolved_id)
        if record is None:
            raise ChatToolError("수정할 메모리를 찾을 수 없습니다.")
        record.content = normalized
        await session.commit()
        await session.refresh(record)
    return {"id": str(record.id), "content": record.content, "source": record.source}


@tool
async def memory_delete(memory_id: str, runtime: ToolRuntime) -> dict[str, str]:
    """현재 사용자의 장기 메모리를 삭제합니다."""

    owner, _ = require_runtime_user(runtime)
    try:
        resolved_id = UUID(memory_id)
    except ValueError as exc:
        raise ChatToolError("메모리 ID 형식이 올바르지 않습니다.") from exc
    async with get_session_factory()() as session:
        record = await memory_repository.get(session, owner, resolved_id)
        if record is None:
            raise ChatToolError("삭제할 메모리를 찾을 수 없습니다.")
        record.deleted_at = utc_now()
        await session.commit()
    return {"id": memory_id, "status": "deleted"}


MEMORY_TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        tool=memory_search,
        name="memory_search",
        description="현재 사용자의 활성 장기 메모리를 검색합니다.",
        category="rag",
        args_schema=memory_search.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=memory_create,
        name="memory_create",
        description="사용자 승인 뒤 장기 메모리를 새로 저장합니다.",
        category="system",
        args_schema=memory_create.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=memory_update,
        name="memory_update",
        description="사용자 승인 뒤 기존 장기 메모리를 수정합니다.",
        category="system",
        args_schema=memory_update.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=memory_delete,
        name="memory_delete",
        description="사용자 승인 뒤 기존 장기 메모리를 삭제합니다.",
        category="system",
        args_schema=memory_delete.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
)
