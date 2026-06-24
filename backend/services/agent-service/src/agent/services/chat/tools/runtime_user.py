from __future__ import annotations

from collections.abc import Mapping
from typing import Any
from uuid import UUID

from langchain_core.runnables import RunnableConfig
from langgraph.prebuilt import ToolRuntime
from langgraph.runtime import BaseUser

from agent.services.chat.tools import ChatToolError


def _extract_mapping(config: RunnableConfig, key: str) -> Mapping[str, Any] | None:
    raw_value = config.get(key, {})
    return raw_value if isinstance(raw_value, Mapping) else None


def extract_runtime_value(
    config: RunnableConfig,
    context: Mapping[str, Any] | None,
    key: str,
) -> Any:
    """Runtime.context 우선, config fallback 순서로 실행 값을 읽습니다.

    LangGraph 0.6+의 권장 경로는 Runtime.context지만, 현재 React stream 전송과
    로컬 테스트 일부는 config.configurable로 실행 값을 넘길 수 있어 둘 다 허용한다.
    참고:
    https://docs.langchain.com/oss/python/langchain/tools#context
    """

    if context is not None and key in context:
        return context[key]

    configurable = _extract_mapping(config, "configurable")
    if configurable is not None and key in configurable:
        return configurable[key]

    return None


def _server_user_access_token(user: BaseUser) -> str | None:
    if "access_token" not in user:
        return None
    access_token = user["access_token"]
    return access_token if isinstance(access_token, str) and access_token else None


def require_runtime_user(runtime: ToolRuntime[Any, Any]) -> tuple[str, str | None]:
    """Agent Server가 서버 측에서 주입한 인증 사용자만 신뢰합니다."""

    # LangGraph Server의 도구 인증 사용자 공식 경로는 ToolRuntime.server_info.user다.
    # config.configurable.langgraph_auth_user는 서버 내부 worker 전달 구현 세부사항이므로
    # 애플리케이션 도구 코드에서는 읽지 않는다.
    # https://docs.langchain.com/oss/python/langchain/tools#server-info
    if runtime.server_info is None or runtime.server_info.user is None:
        raise ChatToolError("인증 사용자 컨텍스트를 확인할 수 없습니다.")

    user = runtime.server_info.user
    identity = user.identity
    if not isinstance(identity, str) or not identity:
        raise ChatToolError("인증 사용자 식별자를 확인할 수 없습니다.")
    return identity, _server_user_access_token(user)


def require_app_thread_id(runtime: ToolRuntime[Any, Any]) -> UUID:
    """클라이언트 실행 컨텍스트의 앱 스레드 ID를 검증합니다."""

    context = runtime.context if isinstance(runtime.context, Mapping) else None
    raw_thread_id = extract_runtime_value(runtime.config, context, "app_thread_id")
    if not isinstance(raw_thread_id, str):
        raise ChatToolError("앱 스레드 컨텍스트를 확인할 수 없습니다.")
    try:
        return UUID(raw_thread_id)
    except ValueError as exc:
        raise ChatToolError("앱 스레드 ID 형식이 올바르지 않습니다.") from exc
