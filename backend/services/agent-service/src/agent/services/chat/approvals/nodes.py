from typing import Any, cast

from langchain_core.messages import AIMessage, AnyMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langgraph.prebuilt import ToolNode
from langgraph.types import Command, interrupt

from agent.services.chat.approvals.messages import (
    decision_for_tool_call,
    edited_tool_call,
    get_latest_ai_message_with_tool_calls,
    missing_decision_tool_message,
    rejected_tool_message,
    responded_tool_message,
)
from agent.services.chat.approvals.policy import (
    build_action_request,
    build_review_config,
    default_allowed_tools,
    requires_approval,
)
from agent.services.chat.approvals.schemas import ApprovalDecision, ApprovalInterruptPayload, ApprovalResumePayload
from agent.services.chat.state import ChatState
from agent.services.chat.tools import ChatToolError
from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOLS


def _handle_chat_tool_error(error: Exception) -> str:
    if isinstance(error, ChatToolError):
        return str(error)
    raise error


_tool_node = ToolNode(CHAT_TOOLS, handle_tool_errors=_handle_chat_tool_error)


def approval_gate(state: ChatState) -> Command[Any]:
    """최신 tool call에 사용자 승인이 필요하면 graph를 일시 중단합니다."""

    ai_message = get_latest_ai_message_with_tool_calls(list(state["messages"]))
    if ai_message is None:
        return Command(goto="tools")

    allowed_tools = state.get("allowed_tools", default_allowed_tools())
    interrupt_on = state.get("interrupt_on", {})
    action_requests = []
    review_configs = []

    for tool_call in ai_message.tool_calls:
        tool_call_dict = cast(dict[str, Any], dict(tool_call))
        tool_name = str(tool_call_dict["name"])
        if not requires_approval(tool_name=tool_name, allowed_tools=allowed_tools, interrupt_on=interrupt_on):
            continue

        action_requests.append(
            build_action_request(
                tool_name=tool_name,
                tool_args=tool_call_dict.get("args", {}),
            )
        )
        review_configs.append(
            build_review_config(
                tool_name=tool_name,
                interrupt_on=interrupt_on,
            )
        )

    if not action_requests:
        return Command(update={"tool_approval_decisions": []}, goto="tools")

    resume_payload = cast(
        ApprovalResumePayload,
        interrupt(
            cast(
                ApprovalInterruptPayload,
                {
                    "action_requests": action_requests,
                    "review_configs": review_configs,
                },
            )
        ),
    )

    return Command(
        update={
            "tool_approval_decisions": resume_payload.get("decisions", []),
            "allowed_tools": allowed_tools,
            "interrupt_on": interrupt_on,
        },
        goto="tools",
    )


async def call_tools_with_approval(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, list[AnyMessage] | list[ApprovalDecision]]:
    """승인된 tool call을 실행하고 reject/respond 결정은 ToolMessage로 합성합니다.

    실제 실행은 LangGraph ToolNode에 맡깁니다. 이 node는 HITL 검토 후 실행 가능한 call을
    고르고, 원래 tool_call 순서대로 ToolMessage를 반환하는 역할만 합니다.
    """

    messages = list(state["messages"])
    ai_message = get_latest_ai_message_with_tool_calls(messages)
    if ai_message is None:
        return {"messages": [], "tool_approval_decisions": []}

    allowed_tools = state.get("allowed_tools", default_allowed_tools())
    interrupt_on = state.get("interrupt_on", {})
    decisions = state.get("tool_approval_decisions", [])
    executable_calls: list[dict[str, Any]] = []
    synthetic_messages_by_id: dict[str, ToolMessage] = {}

    approval_decision_index = 0

    for tool_call in ai_message.tool_calls:
        tool_call_dict = cast(dict[str, Any], dict(tool_call))
        tool_call_id = str(tool_call_dict["id"])
        tool_name = str(tool_call_dict["name"])
        needs_approval = requires_approval(
            tool_name=tool_name,
            allowed_tools=allowed_tools,
            interrupt_on=interrupt_on,
        )

        if needs_approval:
            # decisions는 interrupt action_requests 순서와 동일해야 합니다.
            # https://docs.langchain.com/oss/python/langchain/human-in-the-loop#multiple-decisions
            decision = decision_for_tool_call(
                decisions=decisions,
                index=approval_decision_index,
            )
            approval_decision_index += 1
        else:
            decision = None

        if needs_approval and decision is None:
            synthetic_messages_by_id[tool_call_id] = missing_decision_tool_message(tool_call=tool_call_dict)
            continue

        decision_type = (decision or {"type": "approve"}).get("type", "approve")
        if decision_type == "approve":
            executable_calls.append(tool_call_dict)
        elif decision_type == "edit":
            executable_calls.append(edited_tool_call(tool_call=tool_call_dict, decision=decision or {}))
        elif decision_type == "reject":
            synthetic_messages_by_id[tool_call_id] = rejected_tool_message(
                tool_call=tool_call_dict,
                message=(decision or {}).get("message"),
            )
        elif decision_type == "respond":
            synthetic_messages_by_id[tool_call_id] = responded_tool_message(
                tool_call=tool_call_dict,
                message=(decision or {}).get("message"),
            )
        else:
            synthetic_messages_by_id[tool_call_id] = missing_decision_tool_message(tool_call=tool_call_dict)

    executed_messages_by_id: dict[str, ToolMessage] = {}
    if executable_calls:
        executable_ai_message = ai_message.model_copy(update={"tool_calls": executable_calls})
        executable_state = {"messages": [*messages[:-1], executable_ai_message]}
        result = await _tool_node.ainvoke(executable_state, config=cast(Any, config))
        for message in result.get("messages", []):
            if isinstance(message, ToolMessage):
                executed_messages_by_id[message.tool_call_id] = message

    ordered_messages: list[AnyMessage] = []
    for tool_call in ai_message.tool_calls:
        tool_call_dict = cast(dict[str, Any], dict(tool_call))
        tool_call_id = str(tool_call_dict["id"])
        message = synthetic_messages_by_id.get(tool_call_id) or executed_messages_by_id.get(tool_call_id)
        if message is not None:
            ordered_messages.append(cast(AnyMessage, message))

    return {"messages": ordered_messages, "tool_approval_decisions": []}
