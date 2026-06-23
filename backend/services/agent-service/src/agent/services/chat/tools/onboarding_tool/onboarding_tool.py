from __future__ import annotations

from collections.abc import Awaitable
from typing import Any, TypeVar
import httpx
from langchain_core.tools import tool
from langgraph.prebuilt import ToolRuntime

from agent.clients.onboarding_service import onboarding_service_client
from agent.db.models import AgentThreadOnboardingContextRecord
from agent.db.session import get_session_factory
from agent.repositories.workspace import (
    onboarding_context_repository,
    thread_repository,
    utc_now,
)
from agent.services.chat.approvals.schemas import ApprovalDecisionType
from agent.services.chat.tools import ChatToolError
from agent.services.chat.tools.runtime_user import require_app_thread_id, require_runtime_user
from agent.services.chat.tools.tool_spec import ToolSpec

DECISIONS: list[ApprovalDecisionType] = ["approve", "edit", "reject", "respond"]
T = TypeVar("T")


def _require_access_token(runtime: ToolRuntime) -> tuple[str, str]:
    owner, access_token = require_runtime_user(runtime)
    if access_token is None:
        raise ChatToolError("onboarding-service 호출에 필요한 사용자 토큰이 없습니다.")
    return owner, access_token


async def _call_onboarding(request: Awaitable[T]) -> T:
    try:
        return await request
    except (httpx.HTTPError, RuntimeError) as exc:
        raise ChatToolError("onboarding-service 호출에 실패했습니다.") from exc


@tool
async def onboarding_get_default_profile(runtime: ToolRuntime) -> dict[str, Any]:
    """현재 사용자의 기본 창업 성향 프로필을 조회합니다."""

    _, access_token = _require_access_token(runtime)
    result = await _call_onboarding(
        onboarding_service_client.get_default_profile(access_token)
    )
    if result is None:
        raise ChatToolError("현재 사용자에게 기본 성향 프로필이 없습니다.")
    return result


@tool
async def onboarding_get_survey_result(
    result_code: str, runtime: ToolRuntime
) -> dict[str, Any]:
    """결과 코드에 해당하는 창업 성향과 업종 추천을 조회합니다."""

    require_runtime_user(runtime)
    return await _call_onboarding(
        onboarding_service_client.get_survey_result(result_code)
    )


@tool
async def onboarding_get_area_recommendations(
    result_code: str,
    category_code: str,
    runtime: ToolRuntime,
    top_k: int = 5,
) -> dict[str, Any]:
    """성향 결과와 업종에 맞는 상권 추천을 조회합니다."""

    require_runtime_user(runtime)
    return await _call_onboarding(
        onboarding_service_client.get_area_recommendations(
            result_code, category_code, max(1, min(top_k, 10))
        )
    )


@tool
async def onboarding_preview_profile_update(
    base_result_code: str,
    patch: dict[str, float],
    evidence: list[dict[str, str]],
    runtime: ToolRuntime,
) -> dict[str, Any]:
    """대화 근거로 성향 축을 바꿨을 때의 저장 전 변경안을 계산합니다."""

    _, access_token = _require_access_token(runtime)
    return await _call_onboarding(
        onboarding_service_client.preview_profile_update(
            access_token,
            {
                "base_result_code": base_result_code,
                "patch": patch,
                "evidence": evidence,
            },
        )
    )


@tool
async def onboarding_commit_profile_update(
    base_result_code: str,
    patch: dict[str, float],
    evidence: list[dict[str, str]],
    runtime: ToolRuntime,
    selected_category_code: str | None = None,
) -> dict[str, Any]:
    """사용자 승인 뒤 새 성향 결과를 저장하고 현재 스레드에 연결합니다."""

    owner, access_token = _require_access_token(runtime)
    app_thread_id = require_app_thread_id(runtime)
    async with get_session_factory()() as session:
        thread = await thread_repository.get(session, owner, app_thread_id)
        if thread is None:
            raise ChatToolError("성향 결과를 연결할 스레드를 찾을 수 없습니다.")

    result = await _call_onboarding(
        onboarding_service_client.commit_profile_update(
            access_token,
            {
                "base_result_code": base_result_code,
                "patch": patch,
                "evidence": evidence,
            },
        )
    )
    result_code = result.get("result_code")
    if not isinstance(result_code, str) or not result_code:
        raise ChatToolError("성향 갱신 응답에 result_code가 없습니다.")

    async with get_session_factory()() as session:
        current = await onboarding_context_repository.get(session, owner, app_thread_id)
        previous_result_code = current.result_code if current else None
        if current is None:
            current = AgentThreadOnboardingContextRecord(
                auth_user_uuid=owner,
                thread_id=app_thread_id,
                result_code=result_code,
                selected_category_code=selected_category_code,
                source="agent_update",
            )
            session.add(current)
        else:
            current.result_code = result_code
            current.selected_category_code = selected_category_code
            current.source = "agent_update"
            current.attached_at = utc_now()
        await onboarding_context_repository.add_event(
            session,
            owner=owner,
            thread_id=app_thread_id,
            previous_result_code=previous_result_code,
            next_result_code=result_code,
            selected_category_code=selected_category_code,
            source="agent_update",
            summary="대화 근거를 반영해 성향 프로필을 갱신했습니다.",
            diff=patch,
            tool_call_id=runtime.tool_call_id,
        )
        await session.commit()
    return result


ONBOARDING_TOOL_SPECS: tuple[ToolSpec, ...] = (
    ToolSpec(
        tool=onboarding_get_default_profile,
        name="onboarding_get_default_profile",
        description="현재 사용자의 기본 창업 성향 프로필을 조회합니다.",
        category="rag",
        args_schema=onboarding_get_default_profile.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=onboarding_get_survey_result,
        name="onboarding_get_survey_result",
        description="결과 코드에 해당하는 창업 성향과 업종 추천을 조회합니다.",
        category="rag",
        args_schema=onboarding_get_survey_result.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=onboarding_get_area_recommendations,
        name="onboarding_get_area_recommendations",
        description="성향 결과와 업종에 맞는 상권 추천을 조회합니다.",
        category="rag",
        args_schema=onboarding_get_area_recommendations.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=onboarding_preview_profile_update,
        name="onboarding_preview_profile_update",
        description="대화 근거를 반영한 성향 변경안을 저장 없이 계산합니다.",
        category="system",
        args_schema=onboarding_preview_profile_update.args_schema,
        default_allowed=True,
        allowed_decisions=DECISIONS,
    ),
    ToolSpec(
        tool=onboarding_commit_profile_update,
        name="onboarding_commit_profile_update",
        description="사용자 승인 뒤 새 성향 결과를 저장하고 현재 스레드에 연결합니다.",
        category="system",
        args_schema=onboarding_commit_profile_update.args_schema,
        default_allowed=False,
        allowed_decisions=DECISIONS,
    ),
)
