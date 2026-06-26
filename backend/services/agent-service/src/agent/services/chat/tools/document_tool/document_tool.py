from __future__ import annotations

from typing import Any
from uuid import UUID

from langchain_core.tools import tool
from langgraph.prebuilt import ToolRuntime

from agent.db.models import AgentContentRecord, AgentDocumentRecord
from agent.db.session import get_session_factory
from agent.repositories.workspace import (
    artifact_repository,
    content_repository,
    document_repository,
    utc_now,
)
from agent.schemas.workspace import ContentType
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


def _normalize_raw_text(raw_text: str) -> str:
    normalized = raw_text.strip()
    if not normalized:
        raise ChatToolError("저장할 문서 본문이 비어 있습니다.")
    return normalized


def _payload(
    record: AgentDocumentRecord,
    content: AgentContentRecord,
    *,
    include_raw_text: bool = True,
) -> dict[str, Any]:
    return {
        "id": str(record.id),
        "type": content.type,
        "title": content.title,
        "summary": content.summary,
        **({"raw_text": content.raw_text} if include_raw_text else {}),
        "source_artifact_id": (
            str(record.source_artifact_id) if record.source_artifact_id is not None else None
        ),
    }


@tool
async def document_search(
    query: str, runtime: ToolRuntime, limit: int = 10
) -> list[dict[str, Any]]:
    """현재 사용자의 문서를 제목, 요약, 타입 기준으로 검색합니다."""

    owner, _ = require_runtime_user(runtime)
    normalized = query.strip().casefold()
    async with get_session_factory()() as session:
        records = await document_repository.list(session, owner)
        contents = {
            content.id: content
            for content in await content_repository.list_by_ids(
                session, [record.content_id for record in records]
            )
        }
    matched: list[dict[str, Any]] = []
    for record in records:
        content = contents.get(record.content_id)
        if content is None:
            continue
        if (
            not normalized
            or (content.title is not None and normalized in content.title.casefold())
            or (content.summary is not None and normalized in content.summary.casefold())
            or normalized in content.type.casefold()
        ):
            matched.append(_payload(record, content, include_raw_text=False))
    return matched[: max(1, min(limit, 20))]


@tool
async def document_read(document_id: str, runtime: ToolRuntime) -> dict[str, Any]:
    """현재 사용자가 소유한 문서의 메타데이터와 원문을 읽습니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await document_repository.get(session, owner, _uuid(document_id))
        if record is None:
            raise ChatToolError("문서를 찾을 수 없습니다.")
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise ChatToolError("문서 본문을 찾을 수 없습니다.")
    return _payload(record, content)


@tool
async def document_create(
    document_type: ContentType,
    raw_text: str,
    runtime: ToolRuntime,
    title: str | None = None,
    summary: str | None = None,
    source_artifact_id: str | None = None,
) -> dict[str, Any]:
    """현재 사용자의 문서를 사용자 승인 뒤 새로 저장합니다.

    필수 인자:
    - document_type: commercial_report | search_report | research_report | markdown | code
    - raw_text: 저장할 본문 문자열

    선택 인자:
    - title: 문서 제목
    - summary: 문서 요약
    - source_artifact_id: 원본 아티팩트 ID

    차트를 넣고 싶다면 raw_text 안에 아래와 같은 markdown fenced block을 넣습니다.
    ```chart
    {"type":"bar","xKey":"label","series":[{"key":"value","label":"값"}],"data":[{"label":"A","value":1}]}
    ```
    """

    owner, _ = require_runtime_user(runtime)
    resolved_source_artifact_id: UUID | None = None
    if source_artifact_id is not None:
        resolved_source_artifact_id = _uuid(source_artifact_id)

    async with get_session_factory()() as session:
        if resolved_source_artifact_id is not None:
            source_artifact = await artifact_repository.get(
                session, owner, resolved_source_artifact_id
            )
            if source_artifact is None:
                raise ChatToolError("원본 아티팩트를 찾을 수 없습니다.")
        content = AgentContentRecord(
            type=document_type,
            title=title,
            summary=summary,
            raw_text=_normalize_raw_text(raw_text),
        )
        session.add(content)
        await session.flush()
        document = AgentDocumentRecord(
            auth_user_uuid=owner,
            content_id=content.id,
            source_artifact_id=resolved_source_artifact_id,
        )
        session.add(document)
        await session.commit()
        await session.refresh(document)
        await session.refresh(content)
    return _payload(document, content)


@tool
async def document_update(
    document_id: str,
    runtime: ToolRuntime,
    title: str | None = None,
    summary: str | None = None,
    raw_text: str | None = None,
) -> dict[str, Any]:
    """현재 사용자의 문서를 사용자 승인 뒤 수정합니다.

    raw_text를 수정할 때는 document_create와 같은 형식으로 markdown과 chart fenced block을 사용할 수 있습니다.
    """

    owner, _ = require_runtime_user(runtime)
    resolved_document_id = _uuid(document_id)
    async with get_session_factory()() as session:
        record = await document_repository.get(session, owner, resolved_document_id)
        if record is None:
            raise ChatToolError("수정할 문서를 찾을 수 없습니다.")
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise ChatToolError("수정할 문서 본문을 찾을 수 없습니다.")
        if title is not None:
            content.title = title
        if summary is not None:
            content.summary = summary
        if raw_text is not None:
            content.raw_text = _normalize_raw_text(raw_text)
        await session.commit()
        await session.refresh(record)
        await session.refresh(content)
    return _payload(record, content)


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
        description="현재 사용자의 문서를 제목, 요약, 타입 기준으로 검색합니다.",
        category="document",
        args_schema=document_search.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=document_read,
        name="document_read",
        description="현재 사용자가 소유한 문서의 메타데이터와 원문을 읽습니다.",
        category="document",
        args_schema=document_read.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=document_create,
        name="document_create",
        description=(
            "사용자 승인 뒤 현재 사용자의 문서를 새로 저장합니다. "
            "document_type은 commercial_report/search_report/research_report/markdown/code 중 하나입니다. "
            "차트는 raw_text 안의 ```chart``` JSON block으로 작성할 수 있습니다."
        ),
        category="document",
        args_schema=document_create.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=document_update,
        name="document_update",
        description=(
            "사용자 승인 뒤 현재 사용자의 문서를 수정합니다. "
            "raw_text를 바꾸면 markdown 본문과 ```chart``` JSON block도 함께 갱신할 수 있습니다."
        ),
        category="document",
        args_schema=document_update.args_schema,
        default_allowed=False,
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
