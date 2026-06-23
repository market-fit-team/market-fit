from __future__ import annotations

from typing import Any
from uuid import UUID

from langchain_core.tools import tool
from langgraph.prebuilt import ToolRuntime

from agent.db.session import get_session_factory
from agent.repositories.workspace import document_repository, utc_now
from agent.services.chat.approvals.schemas import ApprovalDecisionType
from agent.services.chat.tools import ChatToolError
from agent.services.chat.tools.runtime_user import require_runtime_user
from agent.services.chat.tools.tool_spec import ToolSpec

DECISIONS: list[ApprovalDecisionType] = ["approve", "edit", "reject", "respond"]


def _uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except ValueError as exc:
        raise ChatToolError("문서 ID 형식이 올바르지 않습니다.") from exc


def _payload(record: Any) -> dict[str, Any]:
    return {
        "id": str(record.id),
        "name": record.name,
        "path": record.path,
        "type": record.type,
        "size_bytes": record.size_bytes,
        "content_ref": record.content_ref,
        "external_ref": record.external_ref,
        "metadata": record.metadata_json,
    }


@tool
async def document_search(
    query: str, runtime: ToolRuntime, limit: int = 10
) -> list[dict[str, Any]]:
    """현재 사용자의 문서 메타데이터를 이름과 경로로 검색합니다."""

    owner, _ = require_runtime_user(runtime)
    normalized = query.strip().casefold()
    async with get_session_factory()() as session:
        records = await document_repository.list(session, owner)
    matched = [
        record
        for record in records
        if not normalized
        or normalized in record.name.casefold()
        or normalized in record.path.casefold()
    ]
    return [_payload(record) for record in matched[: max(1, min(limit, 20))]]


@tool
async def document_read(document_id: str, runtime: ToolRuntime) -> dict[str, Any]:
    """현재 사용자가 소유한 문서의 메타데이터와 콘텐츠 참조를 읽습니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await document_repository.get(session, owner, _uuid(document_id))
    if record is None:
        raise ChatToolError("문서를 찾을 수 없습니다.")
    return _payload(record)


@tool
async def document_delete(document_id: str, runtime: ToolRuntime) -> dict[str, str]:
    """현재 사용자가 소유한 문서를 사용자 승인 뒤 삭제합니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await document_repository.get(session, owner, _uuid(document_id))
        if record is None:
            raise ChatToolError("삭제할 문서를 찾을 수 없습니다.")
        record.deleted_at = utc_now()
        await session.commit()
    return {"id": document_id, "status": "deleted"}


DOCUMENT_TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        tool=document_search,
        name="document_search",
        description="현재 사용자의 문서 이름과 경로를 검색합니다.",
        category="document",
        args_schema=document_search.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=document_read,
        name="document_read",
        description="현재 사용자가 소유한 문서 메타데이터를 읽습니다.",
        category="document",
        args_schema=document_read.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=document_delete,
        name="document_delete",
        description="사용자 승인 뒤 현재 사용자의 문서를 삭제합니다.",
        category="document",
        args_schema=document_delete.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
)
