from typing import Any

from langchain_core.messages import AIMessage, ToolMessage
from langchain_core.messages.tool import ToolCall

from agent.services.chat.approvals.schemas import ApprovalDecision


def get_latest_ai_message_with_tool_calls(messages: list[Any]) -> AIMessage | None:
    """tool call을 포함한 최신 AIMessage가 있으면 반환합니다."""

    for message in reversed(messages):
        if isinstance(message, AIMessage) and message.tool_calls:
            return message
    return None


def decision_for_tool_call(
    *,
    decisions: list[ApprovalDecision],
    index: int,
) -> ApprovalDecision | None:
    """공식 HITL 계약에 따라 action_requests 순서와 같은 위치의 결정을 반환합니다."""

    if index < len(decisions):
        return decisions[index]

    return None


def edited_tool_call(*, tool_call: ToolCall, decision: ApprovalDecision) -> ToolCall:
    """원래 tool_call_id를 유지하면서 edit 결정을 적용합니다."""

    edited_payload = decision.get("editedAction") or {}
    return {
        "name": edited_payload.get("name", tool_call["name"]),
        "args": edited_payload.get("args", tool_call.get("args", {})),
        "id": str(tool_call["id"]),
        "type": tool_call.get("type", "tool_call"),
    }


def rejected_tool_message(*, tool_call: ToolCall, message: str | None = None) -> ToolMessage:
    """사용자가 tool call을 거절했음을 model에 알리는 ToolMessage를 만듭니다."""

    return ToolMessage(
        content=message or "사용자가 이 tool call을 거절했습니다.",
        name=tool_call["name"],
        tool_call_id=str(tool_call["id"]),
        status="error",
    )


def responded_tool_message(*, tool_call: ToolCall, message: str | None = None) -> ToolMessage:
    """사용자 응답을 model에 다시 전달하는 ToolMessage를 만듭니다."""

    return ToolMessage(
        content=message or "사용자가 이 tool call을 실행하지 않고 응답했습니다.",
        name=tool_call["name"],
        tool_call_id=str(tool_call["id"]),
        status="success",
    )


def missing_decision_tool_message(*, tool_call: ToolCall) -> ToolMessage:
    """필수 사용자 결정이 없을 때 안전한 error ToolMessage를 만듭니다."""

    return ToolMessage(
        content="Tool 실행에는 사용자 승인이 필요하지만 승인 결정이 제공되지 않았습니다.",
        name=tool_call["name"],
        tool_call_id=str(tool_call["id"]),
        status="error",
    )
