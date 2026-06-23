from __future__ import annotations

from typing import Any
from uuid import UUID

from langgraph.prebuilt import ToolRuntime

from agent.services.chat.tools import ChatToolError


def require_runtime_user(runtime: ToolRuntime[Any, Any]) -> tuple[str, str | None]:
    """Agent Server가 서버 측에서 주입한 인증 사용자만 신뢰합니다."""

    configurable = runtime.config.get("configurable", {})
    raw_user = configurable.get("langgraph_auth_user")
    if not isinstance(raw_user, dict):
        raise ChatToolError("인증 사용자 컨텍스트를 확인할 수 없습니다.")
    identity = raw_user.get("identity")
    if not isinstance(identity, str) or not identity:
        raise ChatToolError("인증 사용자 식별자를 확인할 수 없습니다.")
    access_token = raw_user.get("access_token")
    return identity, access_token if isinstance(access_token, str) else None


def require_app_thread_id(runtime: ToolRuntime[Any, Any]) -> UUID:
    """클라이언트 실행 컨텍스트의 앱 스레드 ID를 검증합니다."""

    context = runtime.context
    raw_thread_id = context.get("app_thread_id") if isinstance(context, dict) else None
    if not isinstance(raw_thread_id, str):
        raise ChatToolError("앱 스레드 컨텍스트를 확인할 수 없습니다.")
    try:
        return UUID(raw_thread_id)
    except ValueError as exc:
        raise ChatToolError("앱 스레드 ID 형식이 올바르지 않습니다.") from exc
