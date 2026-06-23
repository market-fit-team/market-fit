from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOL_SPECS_BY_NAME


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
        "artifact_delete",
        "document_delete",
        "onboarding_commit_profile_update",
    ):
        spec = CHAT_TOOL_SPECS_BY_NAME[tool_name]
        assert spec.default_allowed is False
        assert spec.allowed_decisions == ["approve", "edit", "reject", "respond"]
