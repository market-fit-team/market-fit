from pathlib import Path

from evals.agent_eval.models import StreamRecord
from evals.agent_eval.sse import (
    SseParser,
    collect_model_text,
    interrupt_requests,
    is_terminal_protocol_event,
    protocol_v2_tool_call,
    protocol_v2_tool_started,
    terminal_lifecycle_status,
)
from evals.agent_eval.validators import ValidationContext, validate_rule


def record(event: str, data: dict) -> StreamRecord:
    return StreamRecord(event=event, data=data, raw="")


def protocol_event(event: str, data: dict) -> StreamRecord:
    return record(event, {"params": {"namespace": [], "data": data}})


def test_sse_parser_handles_frames_split_across_chunks() -> None:
    parser = SseParser()

    assert parser.feed('event: messages\r\ndata: {"params":') == []
    assert parser.feed(' {"data": {"event": "message-start"}}}\r') == []
    events = parser.feed("\n\r\n")

    assert len(events) == 1
    assert events[0].event == "messages"
    assert events[0].data["params"]["data"]["event"] == "message-start"


def test_sse_parser_ignores_comment_only_heartbeat_frames() -> None:
    parser = SseParser()

    assert parser.feed(": heartbeat\r\n\r\n") == []


def test_collect_model_text_uses_only_v2_text_deltas() -> None:
    events = [
        protocol_event(
            "messages",
            {
                "event": "content-block-delta",
                "delta": {"type": "reasoning-delta", "reasoning": "private"},
            },
        ),
        protocol_event(
            "messages",
            {
                "event": "content-block-delta",
                "delta": {"type": "text-delta", "text": "hello"},
            },
        ),
        protocol_event(
            "messages",
            {
                "event": "content-block-finish",
                "content": {"type": "text", "text": "hello"},
            },
        ),
        record("on_chat_model_stream", {"data": {"chunk": {"content": "legacy"}}}),
    ]

    assert collect_model_text(events) == "hello"


def test_interrupt_requests_accept_only_input_requested() -> None:
    payload = {"action_requests": [{"name": "divide"}], "review_configs": []}
    events = [
        record(
            "on_chain_stream",
            {"data": {"chunk": {"__interrupt__": [{"value": payload}]}}},
        ),
        protocol_event(
            "input.requested",
            {
                "interrupt_id": "interrupt-1",
                "payload": payload,
            },
        ),
    ]

    assert interrupt_requests(events) == [
        {
            "interrupt_id": "interrupt-1",
            "namespace": [],
            "value": payload,
        }
    ]


def test_tool_and_lifecycle_extractors_use_protocol_v2_events() -> None:
    started = protocol_event(
        "tools",
        {
            "event": "tool-started",
            "tool_name": "add",
            "input": {"a": 2, "b": 3},
        },
    )
    interrupted = protocol_event("lifecycle", {"event": "interrupted"})
    completed = protocol_event("lifecycle", {"event": "completed"})
    message_tool_call = protocol_event(
        "messages",
        {
            "event": "content-block-finish",
            "content": {
                "type": "tool_call",
                "name": "add",
                "args": {"a": 2, "b": 3},
            },
        },
    )

    assert protocol_v2_tool_started(started) == ("add", {"a": 2, "b": 3})
    assert protocol_v2_tool_call(message_tool_call) == ("add", {"a": 2, "b": 3})
    assert is_terminal_protocol_event(interrupted)
    assert terminal_lifecycle_status([interrupted, completed]) == "completed"


def test_validators_reject_legacy_tool_and_done_events(tmp_path: Path) -> None:
    context = ValidationContext(
        events=[
            record("on_tool_start", {"name": "add", "data": {"input": {"a": 2, "b": 3}}}),
            record("done", {}),
        ],
        workdir=tmp_path,
    )

    assert not validate_rule({"type": "tool_called", "tool": "add"}, context).passed
    assert not validate_rule({"type": "run_completed"}, context).passed
