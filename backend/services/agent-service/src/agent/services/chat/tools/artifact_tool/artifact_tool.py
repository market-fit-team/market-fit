from __future__ import annotations

from typing import Any
from uuid import UUID

from langchain_core.tools import tool
from langgraph.prebuilt import ToolRuntime

from agent.db.models import AgentArtifactRecord, AgentContentRecord, AgentDocumentRecord
from agent.db.session import get_session_factory
from agent.repositories.workspace import (
    artifact_repository,
    content_repository,
    thread_repository,
)
from agent.schemas.workspace import ContentType
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


def _normalize_raw_text(raw_text: str) -> str:
    normalized = raw_text.strip()
    if not normalized:
        raise ChatToolError("본문은 비어 있을 수 없습니다.")
    return normalized


def _artifact_payload(record: AgentArtifactRecord, content: AgentContentRecord) -> dict[str, Any]:
    return {
        "id": str(record.id),
        "thread_id": str(record.thread_id),
        "type": content.type,
        "title": content.title,
        "summary": content.summary,
        "raw_text": content.raw_text,
        "version": record.version,
        "source_message_id": record.source_message_id,
        "source_tool_call_id": record.source_tool_call_id,
    }


def _document_payload(
    record: AgentDocumentRecord,
    content: AgentContentRecord,
) -> dict[str, Any]:
    return {
        "id": str(record.id),
        "type": content.type,
        "title": content.title,
        "summary": content.summary,
        "raw_text": content.raw_text,
        "source_artifact_id": (
            str(record.source_artifact_id) if record.source_artifact_id is not None else None
        ),
    }


@tool
async def artifact_get(artifact_id: str, runtime: ToolRuntime) -> dict[str, Any]:
    """현재 사용자가 소유한 저장 아티팩트를 조회합니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await artifact_repository.get(session, owner, _uuid(artifact_id, "아티팩트"))
        if record is None:
            raise ChatToolError("아티팩트를 찾을 수 없습니다.")
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise ChatToolError("아티팩트 본문을 찾을 수 없습니다.")
    return _artifact_payload(record, content)


@tool
async def artifact_create(
    artifact_type: ContentType,
    raw_text: str,
    runtime: ToolRuntime,
    title: str | None = None,
    summary: str | None = None,
) -> dict[str, Any]:
    """대화에서 만든 결과를 사용자 승인 뒤 아티팩트로 저장합니다.

    필수 인자:
    - artifact_type: commercial_report | search_report | research_report | markdown | code
    - raw_text: 저장할 본문 문자열

    선택 인자:
    - title: 아티팩트 제목
    - summary: 아티팩트 요약

    차트를 넣고 싶다면 raw_text 안에 아래와 같은 markdown fenced block을 넣습니다.
    ```chart
    {"type":"bar","xKey":"label","series":[{"key":"value","label":"값"}],"data":[{"label":"A","value":1}]}
    ```
    """

    owner, _ = require_runtime_user(runtime)
    app_thread_id = require_app_thread_id(runtime)
    async with get_session_factory()() as session:
        thread = await thread_repository.get(session, owner, app_thread_id)
        if thread is None:
            raise ChatToolError("아티팩트를 저장할 스레드를 찾을 수 없습니다.")
        content = AgentContentRecord(
            type=artifact_type,
            title=title,
            summary=summary,
            raw_text=_normalize_raw_text(raw_text),
        )
        session.add(content)
        await session.flush()
        record = AgentArtifactRecord(
            auth_user_uuid=owner,
            thread_id=thread.id,
            langgraph_thread_id=thread.langgraph_thread_id,
            content_id=content.id,
            source_tool_call_id=runtime.tool_call_id,
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        await session.refresh(content)
    return _artifact_payload(record, content)


@tool
async def artifact_update(
    artifact_id: str,
    runtime: ToolRuntime,
    title: str | None = None,
    summary: str | None = None,
    raw_text: str | None = None,
) -> dict[str, Any]:
    """저장된 아티팩트 본문을 사용자 승인 뒤 새 버전으로 갱신합니다.

    raw_text를 수정할 때는 artifact_create와 같은 형식으로 markdown과 chart fenced block을 사용할 수 있습니다.
    """

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        record = await artifact_repository.get(
            session, owner, _uuid(artifact_id, "아티팩트")
        )
        if record is None:
            raise ChatToolError("수정할 아티팩트를 찾을 수 없습니다.")
        content = await content_repository.get(session, record.content_id)
        if content is None:
            raise ChatToolError("수정할 아티팩트 본문을 찾을 수 없습니다.")
        if title is not None:
            content.title = title
        if summary is not None:
            content.summary = summary
        if raw_text is not None:
            normalized_raw_text = _normalize_raw_text(raw_text)
            if normalized_raw_text != content.raw_text:
                content.raw_text = normalized_raw_text
                record.version += 1
        await session.commit()
        await session.refresh(record)
        await session.refresh(content)
    return _artifact_payload(record, content)


@tool
async def artifact_save_as_document(
    artifact_id: str, runtime: ToolRuntime
) -> dict[str, Any]:
    """아티팩트를 현재 사용자의 재사용 문서로 복사 저장합니다."""

    owner, _ = require_runtime_user(runtime)
    async with get_session_factory()() as session:
        artifact = await artifact_repository.get(
            session, owner, _uuid(artifact_id, "아티팩트")
        )
        if artifact is None:
            raise ChatToolError("저장할 아티팩트를 찾을 수 없습니다.")
        artifact_content = await content_repository.get(session, artifact.content_id)
        if artifact_content is None:
            raise ChatToolError("아티팩트 본문을 찾을 수 없습니다.")
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
    return _document_payload(document, copied_content)


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
        description=(
            "사용자 승인 뒤 대화 결과를 아티팩트로 저장합니다. "
            "artifact_type은 commercial_report/search_report/research_report/markdown/code 중 하나입니다. "
            "차트는 raw_text 안의 ```chart``` JSON block으로 작성할 수 있습니다."
        ),
        category="document",
        args_schema=artifact_create.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=artifact_update,
        name="artifact_update",
        description=(
            "사용자 승인 뒤 저장된 아티팩트를 수정합니다. "
            "raw_text를 바꾸면 markdown 본문과 ```chart``` JSON block도 함께 갱신할 수 있습니다."
        ),
        category="document",
        args_schema=artifact_update.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=artifact_save_as_document,
        name="artifact_save_as_document",
        description="사용자 승인 뒤 아티팩트를 재사용 가능한 문서로 저장합니다.",
        category="document",
        args_schema=artifact_save_as_document.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
)
