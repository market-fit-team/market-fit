from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_core.tools import tool

from agent.services.chat.nodes import (
    CHAT_SYSTEM_PROMPT,
    DEFAULT_CHAT_TOOL_DESCRIPTIONS,
    _should_bind_tools,
    _system_prompt_for_harness,
    _tools_for_harness,
)


def test_chat_model_binds_tools_before_tool_execution() -> None:
    """아직 tool 결과가 없으면 model이 tool call을 선택할 수 있다."""

    assert _should_bind_tools([HumanMessage(content="10을 2로 나눠줘")]) is True


def test_chat_model_does_not_bind_tools_after_tool_execution() -> None:
    """tool 결과 직후에는 같은 tool call 승인 요청을 다시 만들지 않는다."""

    messages = [
        HumanMessage(content="10을 2로 나눠줘"),
        AIMessage(
            content="",
            tool_calls=[
                {
                    "id": "call-1",
                    "name": "divide",
                    "args": {"a": 10, "b": 2},
                }
            ],
        ),
        ToolMessage(
            content="5",
            name="divide",
            tool_call_id="call-1",
        ),
    ]

    assert _should_bind_tools(messages) is False


def test_harness_overrides_system_prompt() -> None:
    """하네스 eval은 실제 graph 입력의 system prompt를 바꿀 수 있다."""

    overrides = {
        "system_prompt": "평가용 시스템 프롬프트",
    }

    assert _system_prompt_for_harness(overrides) == "평가용 시스템 프롬프트"


def test_chat_model_uses_round_03_prompt_by_default() -> None:
    """기본 시스템 프롬프트는 round-03 계약을 따른다."""

    assert "근거/출처" in CHAT_SYSTEM_PROMPT
    assert "빈 답변으로 끝내지 않습니다." in CHAT_SYSTEM_PROMPT
    assert _system_prompt_for_harness({}) == CHAT_SYSTEM_PROMPT


def test_harness_overrides_tool_description_without_mutating_original() -> None:
    """하네스 eval은 전역 tool 객체를 바꾸지 않고 bind용 설명만 교체한다."""

    @tool
    def sample_tool(value: str) -> str:
        """원래 설명."""

        return value

    harness_tools = _tools_for_harness(
        [sample_tool],
        {"tool_descriptions": {"sample_tool": "평가용 설명."}},
    )

    assert harness_tools[0].description == "평가용 설명."
    assert sample_tool.description == "원래 설명."


def test_chat_model_uses_default_tool_description_when_no_override() -> None:
    """기본 도구 설명도 실제 서비스 계약으로 바인딩한다."""

    @tool
    def web_search(query: str) -> str:
        """원래 설명."""

        return query

    harness_tools = _tools_for_harness([web_search], {})

    assert harness_tools[0].description == DEFAULT_CHAT_TOOL_DESCRIPTIONS["web_search"]
    assert web_search.description == "원래 설명."
