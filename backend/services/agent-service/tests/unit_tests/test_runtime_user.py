from __future__ import annotations

from types import SimpleNamespace

import pytest

from agent.services.chat.tools import ChatToolError
from agent.services.chat.tools.runtime_user import (
    extract_runtime_value,
    require_runtime_user,
)


class FakeUser(dict):
    @property
    def identity(self) -> str:
        return self["identity"]

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def display_name(self) -> str:
        return self.get("display_name", self.identity)

    @property
    def permissions(self) -> list[str]:
        return self.get("permissions", [])


def test_require_runtime_user_reads_tool_runtime_server_info() -> None:
    """도구 인증 사용자는 ToolRuntime.server_info.user에서만 읽는다."""

    runtime = SimpleNamespace(
        context={},
        config={},
        server_info=SimpleNamespace(user=FakeUser(identity="user-a", access_token="token")),
    )

    assert require_runtime_user(runtime) == ("user-a", "token")


def test_require_runtime_user_ignores_configurable_auth_user() -> None:
    """config.configurable의 auth user는 애플리케이션 도구 인증 경로로 쓰지 않는다."""

    runtime = SimpleNamespace(
        context={},
        config={
            "configurable": {
                "langgraph_auth_user": {
                    "identity": "user-a",
                    "access_token": "token",
                }
            }
        },
        server_info=None,
    )

    with pytest.raises(ChatToolError, match="인증 사용자 컨텍스트"):
        require_runtime_user(runtime)


def test_extract_runtime_value_prefers_context_then_configurable() -> None:
    """실행 값은 Runtime.context를 우선하고 없을 때 config fallback을 사용한다."""

    assert (
        extract_runtime_value(
            {"configurable": {"app_thread_id": "from-config"}},
            {"app_thread_id": "from-context"},
            "app_thread_id",
        )
        == "from-context"
    )

    assert (
        extract_runtime_value(
            {"configurable": {"app_thread_id": "from-config"}},
            {},
            "app_thread_id",
        )
        == "from-config"
    )
