from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOL_SPECS_BY_NAME
from agent.services.chat.approvals.nodes import (
    _handle_chat_tool_error,
    _system_context_refresh_update_for_tool_calls,
)
from agent.services.chat.tools import ChatToolError


def test_workspace_read_tools_are_allowed_by_default() -> None:
    """사용자 데이터를 바꾸지 않는 조회 도구는 승인 없이 실행할 수 있다."""

    for tool_name in (
        "memory_search",
        "artifact_get",
        "document_search",
        "document_read",
        "onboarding_get_default_profile",
        "onboarding_get_survey_result",
        "onboarding_get_area_recommendations",
        "onboarding_preview_profile_update",
    ):
        assert CHAT_TOOL_SPECS_BY_NAME[tool_name].default_allowed is True


def test_workspace_mutation_tools_are_default_deny() -> None:
    """메모리·문서·아티팩트·성향을 바꾸는 도구는 모두 HITL 기본 거부다."""

    for tool_name in (
        "memory_create",
        "memory_update",
        "memory_delete",
        "artifact_create",
        "artifact_update",
        "artifact_save_as_document",
        "document_create",
        "document_update",
        "document_delete",
        "onboarding_commit_profile_update",
    ):
        spec = CHAT_TOOL_SPECS_BY_NAME[tool_name]
        assert spec.default_allowed is False
        assert spec.allowed_decisions == ["approve", "edit", "reject", "respond"]


def test_system_context_refresh_flags_follow_memory_and_onboarding_mutations() -> None:
    """메모리·온보딩 변경 도구 실행은 해당 summary dirty flag를 올린다."""

    result = _system_context_refresh_update_for_tool_calls(
        {
            "messages": [],
            "system_context_refresh": {
                "memory_summary_dirty": False,
                "onboarding_summary_dirty": False,
            },
        },
        [
            {"id": "tool-1", "name": "memory_create", "args": {}},
            {"id": "tool-2", "name": "onboarding_commit_profile_update", "args": {}},
        ],
    )

    assert result == {
        "memory_summary_dirty": True,
        "onboarding_summary_dirty": True,
    }


def test_chat_tool_error_handler_returns_model_visible_message() -> None:
    """도구가 예외를 내도 graph를 터뜨리지 않고 ToolMessage 본문으로 돌려준다."""

    assert _handle_chat_tool_error(ChatToolError("본문은 비어 있을 수 없습니다.")) == (
        "도구 실행 실패: 본문은 비어 있을 수 없습니다."
    )
    assert "RuntimeError" in _handle_chat_tool_error(RuntimeError("boom"))


def test_workspace_tool_descriptions_explain_chart_block_usage() -> None:
    """생성 도구 설명에는 타입 목록과 chart block 사용법이 포함되어야 한다."""

    artifact_create = CHAT_TOOL_SPECS_BY_NAME["artifact_create"].tool
    document_create = CHAT_TOOL_SPECS_BY_NAME["document_create"].tool

    assert "artifact_type" in artifact_create.description
    assert "commercial_report" in artifact_create.description
    assert "```chart" in artifact_create.description
    assert "document_type" in document_create.description
    assert "research_report" in document_create.description
    assert "```chart" in document_create.description


def test_workspace_create_tool_args_keep_existing_contract_keys() -> None:
    """차트 설명 보강과 무관하게 생성 도구 입력 계약은 기존 키 이름을 유지해야 한다."""

    artifact_args = CHAT_TOOL_SPECS_BY_NAME["artifact_create"].tool.args
    document_args = CHAT_TOOL_SPECS_BY_NAME["document_create"].tool.args

    assert "artifact_type" in artifact_args
    assert "type" not in artifact_args
    assert "document_type" in document_args
    assert "type" not in document_args
