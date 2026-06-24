from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from agent.services.chat.nodes import _should_bind_tools


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
