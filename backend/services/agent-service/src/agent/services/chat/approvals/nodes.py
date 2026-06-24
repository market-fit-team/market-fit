import logging
from typing import Any

from langchain_core.messages import AnyMessage, ToolMessage
from langchain_core.messages.tool import ToolCall
from langchain_core.runnables import RunnableConfig
from langgraph.prebuilt import ToolNode
from langgraph.runtime import get_runtime
from langgraph.types import Command, interrupt
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError

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
    requires_approval,
)
from agent.services.chat.approvals.schemas import (
    ApprovalDecision,
    ApprovalInterruptPayload,
    ApprovalResumePayload,
)
from agent.services.chat.context import ChatRuntimeContext
from agent.services.chat.state import ChatState
from agent.services.chat.system_context_state import clean_system_context_refresh_state
from agent.services.chat.tools import ChatToolError
from agent.services.chat.toolkits.chat_toolkit import CHAT_TOOLS

logger = logging.getLogger(__name__)


def _log_tool_exception(message: str, error: Exception) -> None:
    logger.error(message, exc_info=(type(error), error, error.__traceback__))


def _safe_error_detail(error: Exception) -> str:
    detail = str(error).strip()
    if not detail:
        return ""
    return detail[:500]


def _handle_chat_tool_error(error: Exception) -> str:
    if isinstance(error, ChatToolError):
        return f"도구 실행 실패: {error}"

    if error.__class__.__name__ == "ToolInvocationError" or isinstance(error, ValidationError):
        return f"도구 입력 검증 실패: {error}"

    if isinstance(error, SQLAlchemyError):
        _log_tool_exception("Workspace tool database error", error)
        return (
            "도구 실행 실패: 워크스페이스 저장소 처리 중 오류가 발생했습니다. "
            "입력을 확인하고 다시 시도해 주세요."
        )

    _log_tool_exception("Unexpected chat tool error", error)
    detail = _safe_error_detail(error)
    detail_suffix = f" 오류 메시지: {detail}" if detail else ""
    return (
        "도구 실행 실패: 예상하지 못한 오류가 발생했습니다. "
        f"오류 유형은 {error.__class__.__name__}입니다.{detail_suffix} "
        "입력을 점검하고 다시 시도해 주세요."
    )


_tool_node = ToolNode(CHAT_TOOLS, handle_tool_errors=_handle_chat_tool_error)

MEMORY_MUTATION_TOOLS = {"memory_create", "memory_update", "memory_delete"}
ONBOARDING_MUTATION_TOOLS = {"onboarding_commit_profile_update"}


def _require_approval_context(context: ChatRuntimeContext) -> tuple[list[str], dict[str, Any]]:
    allowed_tools = context.get("allowed_tools")
    interrupt_on = context.get("interrupt_on")
    if not isinstance(allowed_tools, list):
        raise ValueError("chat runtime context allowed_tools is required")
    if not isinstance(interrupt_on, dict):
        raise ValueError("chat runtime context interrupt_on is required")
    return allowed_tools, interrupt_on


def _require_tool_call_id(tool_call: ToolCall) -> str:
    tool_call_id = tool_call["id"]
    if tool_call_id is None:
        raise ValueError(f"tool call id is required: {tool_call['name']}")
    return tool_call_id


def _system_context_refresh_update_for_tool_calls(
    state: ChatState, tool_calls: list[ToolCall]
) -> dict[str, bool]:
    refresh_state = state.get("system_context_refresh", clean_system_context_refresh_state())
    tool_names = {tool_call["name"] for tool_call in tool_calls}
    return {
        "memory_summary_dirty": refresh_state["memory_summary_dirty"]
        or bool(tool_names & MEMORY_MUTATION_TOOLS),
        "onboarding_summary_dirty": refresh_state["onboarding_summary_dirty"]
        or bool(tool_names & ONBOARDING_MUTATION_TOOLS),
    }


def approval_gate(
    state: ChatState,
) -> Command[Any]:
    """최신 tool call에 사용자 승인이 필요하면 graph를 일시 중단합니다."""

    ai_message = get_latest_ai_message_with_tool_calls(list(state["messages"]))
    if ai_message is None:
        return Command(goto="tools")

    runtime = get_runtime(ChatRuntimeContext)
    context = runtime.context
    allowed_tools, interrupt_on = _require_approval_context(context)
    action_requests = []
    review_configs = []

    for tool_call in ai_message.tool_calls:
        tool_name = tool_call["name"]
        if not requires_approval(
            tool_name=tool_name, allowed_tools=allowed_tools, interrupt_on=interrupt_on
        ):
            continue

        action_requests.append(
            build_action_request(
                tool_name=tool_name,
                tool_args=tool_call["args"],
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

    interrupt_payload: ApprovalInterruptPayload = {
        "action_requests": action_requests,
        "review_configs": review_configs,
    }
    resume_payload: ApprovalResumePayload = interrupt(interrupt_payload)

    return Command(
        update={
            "tool_approval_decisions": resume_payload.get("decisions", []),
        },
        goto="tools",
    )


async def call_tools_with_approval(
    state: ChatState,
    config: RunnableConfig,
) -> dict[str, list[AnyMessage] | list[ApprovalDecision] | dict[str, bool]]:
    """승인된 tool call을 실행하고 reject/respond 결정은 ToolMessage로 합성합니다.

    실제 실행은 LangGraph ToolNode에 맡깁니다. 이 node는 HITL 검토 후 실행 가능한 call을
    고르고, 원래 tool_call 순서대로 ToolMessage를 반환하는 역할만 합니다.
    """

    messages = list(state["messages"])
    ai_message = get_latest_ai_message_with_tool_calls(messages)
    if ai_message is None:
        return {
            "messages": [],
            "tool_approval_decisions": [],
            "system_context_refresh": state.get(
                "system_context_refresh", clean_system_context_refresh_state()
            ),
        }

    runtime = get_runtime(ChatRuntimeContext)
    context = runtime.context
    allowed_tools, interrupt_on = _require_approval_context(context)
    decisions = state.get("tool_approval_decisions", [])
    executable_calls: list[ToolCall] = []
    synthetic_messages_by_id: dict[str, ToolMessage] = {}

    approval_decision_index = 0

    for tool_call in ai_message.tool_calls:
        tool_call_id = _require_tool_call_id(tool_call)
        tool_name = tool_call["name"]
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
            synthetic_messages_by_id[tool_call_id] = missing_decision_tool_message(
                tool_call=tool_call
            )
            continue

        decision_type = (decision or {"type": "approve"}).get("type", "approve")
        if decision_type == "approve":
            executable_calls.append(tool_call)
        elif decision_type == "edit":
            executable_calls.append(edited_tool_call(tool_call=tool_call, decision=decision or {}))
        elif decision_type == "reject":
            synthetic_messages_by_id[tool_call_id] = rejected_tool_message(
                tool_call=tool_call,
                message=(decision or {}).get("message"),
            )
        elif decision_type == "respond":
            synthetic_messages_by_id[tool_call_id] = responded_tool_message(
                tool_call=tool_call,
                message=(decision or {}).get("message"),
            )
        else:
            synthetic_messages_by_id[tool_call_id] = missing_decision_tool_message(
                tool_call=tool_call
            )

    executed_messages_by_id: dict[str, ToolMessage] = {}
    if executable_calls:
        executable_ai_message = ai_message.model_copy(update={"tool_calls": executable_calls})
        executable_state = {"messages": [*messages[:-1], executable_ai_message]}
        result = await _tool_node.ainvoke(executable_state, config=config)
        for message in result.get("messages", []):
            if isinstance(message, ToolMessage):
                executed_messages_by_id[message.tool_call_id] = message

    ordered_messages: list[AnyMessage] = []
    for tool_call in ai_message.tool_calls:
        tool_call_id = _require_tool_call_id(tool_call)
        message = synthetic_messages_by_id.get(tool_call_id) or executed_messages_by_id.get(
            tool_call_id
        )
        if message is not None:
            ordered_messages.append(message)

    return {
        "messages": ordered_messages,
        "tool_approval_decisions": [],
        "system_context_refresh": _system_context_refresh_update_for_tool_calls(
            state, executable_calls
        ),
    }
