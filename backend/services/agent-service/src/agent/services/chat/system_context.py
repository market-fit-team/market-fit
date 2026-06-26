from __future__ import annotations

from collections.abc import Sequence
from html import escape

from langchain_core.messages import AnyMessage, HumanMessage

from agent.services.chat.state import SystemContextState


def build_system_context(system_context_state: SystemContextState | None) -> str | None:
    """세션 스냅샷 상태를 사용자 메시지 하단 XML 블록으로 만든다."""

    if system_context_state is None:
        return None

    selected_documents = system_context_state["selected_documents"]
    selected_artifacts = system_context_state["selected_artifacts"]
    memory_summary = system_context_state["memory_summary"]
    onboarding_summary = system_context_state["onboarding_summary"]

    if (
        not selected_documents
        and not selected_artifacts
        and memory_summary is None
        and onboarding_summary is None
    ):
        return None

    lines = ["<system_context>"]

    if selected_documents:
        lines.append("<selected_documents>")
        for document in selected_documents:
            lines.append(
                f'<document id="{escape(document["id"])}" type="{escape(document["type"])}">'
            )
            if document["title"] is not None:
                lines.append(f'<title>{escape(document["title"])}</title>')
            if document["summary"] is not None:
                lines.append(f'<summary>{escape(document["summary"])}</summary>')
            lines.append("</document>")
        lines.append("</selected_documents>")
        lines.append(
            "<document_usage_hint>선택 문서의 원문이 필요하면 document_read 도구를 사용한다.</document_usage_hint>"
        )

    if selected_artifacts:
        lines.append("<selected_artifacts>")
        for artifact in selected_artifacts:
            lines.append(
                f'<artifact id="{escape(artifact["id"])}" type="{escape(artifact["type"])}" version="{artifact["version"]}">'
            )
            if artifact["title"] is not None:
                lines.append(f'<title>{escape(artifact["title"])}</title>')
            if artifact["summary"] is not None:
                lines.append(f'<summary>{escape(artifact["summary"])}</summary>')
            lines.append("</artifact>")
        lines.append("</selected_artifacts>")
        lines.append(
            "<artifact_usage_hint>선택 아티팩트의 원문이 필요하면 artifact_get 도구를 사용한다.</artifact_usage_hint>"
        )

    if memory_summary is not None:
        lines.append(
            f'<memory_summary has_memories="{str(memory_summary["has_memories"]).lower()}" memory_count="{memory_summary["memory_count"]}" />'
        )

    if onboarding_summary is not None:
        attributes = [
            f'has_default_profile="{str(onboarding_summary["has_default_profile"]).lower()}"',
            f'has_thread_context="{str(onboarding_summary["has_thread_context"]).lower()}"',
        ]
        if onboarding_summary["result_code"] is not None:
            attributes.append(
                f'result_code="{escape(onboarding_summary["result_code"])}"'
            )
        if onboarding_summary["selected_category_code"] is not None:
            attributes.append(
                'selected_category_code="'
                f'{escape(onboarding_summary["selected_category_code"])}"'
            )
        if onboarding_summary["source"] is not None:
            attributes.append(f'source="{escape(onboarding_summary["source"])}"')
        lines.append(f"<onboarding_summary {' '.join(attributes)} />")

        onboarding_hints: list[str] = []
        if onboarding_summary["has_default_profile"]:
            onboarding_hints.append(
                "기본 성향 프로필이 필요하면 onboarding_get_default_profile 도구를 사용한다."
            )
        if onboarding_summary["result_code"] is not None:
            onboarding_hints.append(
                "현재 연결된 성향 결과를 읽으려면 onboarding_get_survey_result 도구를 사용한다."
            )
            onboarding_hints.append(
                "업종별 상권 추천이 필요하면 onboarding_get_area_recommendations 도구를 사용한다."
            )
        if onboarding_hints:
            lines.append(
                "<onboarding_usage_hint>"
                f"{escape(' '.join(onboarding_hints))}"
                "</onboarding_usage_hint>"
            )

    lines.append("</system_context>")
    return "\n".join(lines)


def append_system_context_to_latest_human_message(
    messages: Sequence[AnyMessage], system_context: str | None
) -> list[AnyMessage]:
    """가장 최근 HumanMessage 본문 하단에 system_context를 붙인다."""

    if system_context is None:
        return list(messages)

    updated_messages = list(messages)
    for index in range(len(updated_messages) - 1, -1, -1):
        message = updated_messages[index]
        if not isinstance(message, HumanMessage):
            continue
        if not isinstance(message.content, str):
            break
        updated_messages[index] = message.model_copy(
            update={"content": f"{message.content}\n\n{system_context}"}
        )
        break
    return updated_messages
