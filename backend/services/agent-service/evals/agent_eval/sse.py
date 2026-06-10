"""평가 하네스용 SSE 파서 및 Protocol V2 이벤트 추출 유틸.

주의: 이 파서는 프로덕션 프론트엔드 경로가 아닙니다. 프론트엔드는 커스텀 SSE 파서 없이
공식 ``@langchain/react`` built-in SSE transport를 사용합니다. eval은 서버 호환성 검증을
위해 Protocol V2 frame을 읽습니다.

근거:
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- https://docs.langchain.com/oss/python/langgraph/event-streaming
"""

from __future__ import annotations

import json
from typing import Any

from evals.agent_eval.models import StreamRecord


class SseParser:
    def __init__(self) -> None:
        self._buffer = ""

    def feed(self, chunk: str) -> list[StreamRecord]:
        self._buffer += chunk
        records: list[StreamRecord] = []
        while "\n\n" in self._buffer:
            raw, self._buffer = self._buffer.split("\n\n", 1)
            if raw.strip():
                records.append(parse_sse_frame(raw + "\n\n"))
        return records

    def flush(self) -> list[StreamRecord]:
        if not self._buffer.strip():
            self._buffer = ""
            return []
        raw = self._buffer
        self._buffer = ""
        return [parse_sse_frame(raw)]


def parse_sse_frame(raw: str) -> StreamRecord:
    event = "message"
    data_lines: list[str] = []
    for line in raw.splitlines():
        if line.startswith("event:"):
            event = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            data_lines.append(line.split(":", 1)[1].lstrip())

    data_text = "\n".join(data_lines)
    data: dict[str, Any]
    if data_text:
        loaded = json.loads(data_text)
        data = loaded if isinstance(loaded, dict) else {"value": loaded}
    else:
        data = {}
    return StreamRecord(event=event, data=data, raw=raw)


def parse_sse_frames(text: str) -> list[StreamRecord]:
    parser = SseParser()
    return [*parser.feed(text), *parser.flush()]


def collect_model_text(events: list[StreamRecord]) -> str:
    chunks: list[str] = []
    for event in events:
        if event.event == "on_chat_model_stream":
            content = _extract_chunk_content(event.data.get("data", {}).get("chunk"))
            if content:
                chunks.append(content)
            continue

        if event.event == "on_tool_start":
            name = event.data.get("name", "unknown")
            args = event.data.get("data", {}).get("input", {})
            chunks.append(f"\n\n[Tool Call: {name}]\n> Arguments: {args}\n\n")
            continue

        message_text = _extract_protocol_v2_message_text(event)
        if message_text:
            chunks.append(message_text)

        tool_text = _extract_protocol_v2_tool_text(event)
        if tool_text:
            chunks.append(tool_text)

    return "".join(chunks).strip()


def interrupt_values(events: list[StreamRecord]) -> list[dict[str, Any]]:
    return [request["value"] for request in interrupt_requests(events)]


def interrupt_requests(events: list[StreamRecord]) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = []
    for event in events:
        if event.event == "on_chain_stream":
            chunk = event.data.get("data", {}).get("chunk", {})
            interrupts = chunk.get("__interrupt__") if isinstance(chunk, dict) else None
            if not isinstance(interrupts, list):
                continue
            for interrupt in interrupts:
                if isinstance(interrupt, dict):
                    value = interrupt.get("value")
                    if isinstance(value, dict):
                        values.append({"interrupt_id": "", "namespace": [], "value": value})
            continue

        if event.event == "input.requested":
            params = event.data.get("params", {})
            data = params.get("data", {}) if isinstance(params, dict) else {}
            payload = data.get("payload") if isinstance(data, dict) else None
            interrupt_id = data.get("interrupt_id") if isinstance(data, dict) else None
            namespace = params.get("namespace", []) if isinstance(params, dict) else []
            if isinstance(payload, dict) and isinstance(interrupt_id, str):
                values.append(
                    {
                        "interrupt_id": interrupt_id,
                        "namespace": namespace if isinstance(namespace, list) else [],
                        "value": payload,
                    }
                )
    return values


def is_terminal_protocol_event(event: StreamRecord) -> bool:
    if event.event == "done":
        return True
    if event.event != "lifecycle":
        return False

    params = event.data.get("params", {})
    data = params.get("data", {}) if isinstance(params, dict) else {}
    status = data.get("event") if isinstance(data, dict) else None
    return status in {"completed", "failed", "interrupted"}


def protocol_v2_tool_started(event: StreamRecord) -> tuple[str, dict[str, Any]] | None:
    if event.event != "tools":
        return None
    params = event.data.get("params", {})
    data = params.get("data", {}) if isinstance(params, dict) else {}
    if not isinstance(data, dict) or data.get("event") != "tool-started":
        return None
    name = data.get("tool_name")
    args = data.get("input", {})
    if not isinstance(name, str):
        return None
    return name, args if isinstance(args, dict) else {}


def _extract_protocol_v2_message_text(event: StreamRecord) -> str:
    if event.event != "messages":
        return ""
    params = event.data.get("params", {})
    data = params.get("data", {}) if isinstance(params, dict) else {}
    if not isinstance(data, dict):
        return ""

    if data.get("event") == "content-block-delta":
        delta = data.get("delta", {})
        if isinstance(delta, dict):
            if delta.get("type") == "text-delta":
                text = delta.get("text")
                return text if isinstance(text, str) else ""
            if delta.get("type") == "reasoning-delta":
                return ""

    if data.get("event") in {"content-block-start", "content-block-finish"}:
        content = data.get("content", {})
        if isinstance(content, dict) and content.get("type") == "text":
            text = content.get("text")
            return text if isinstance(text, str) else ""

    return ""


def _extract_protocol_v2_tool_text(event: StreamRecord) -> str:
    started = protocol_v2_tool_started(event)
    if started is not None:
        name, args = started
        return f"\n\n[Tool Call: {name}]\n> Arguments: {args}\n\n"
    return ""


def _extract_chunk_content(chunk: Any) -> str:
    if chunk is None:
        return ""
    if isinstance(chunk, str):
        return chunk
    if isinstance(chunk, dict):
        direct = chunk.get("content")
        if isinstance(direct, str):
            return direct
        kwargs = chunk.get("kwargs")
        if isinstance(kwargs, dict):
            content = kwargs.get("content")
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                return _join_content_parts(content)
    return ""


def _join_content_parts(parts: list[Any]) -> str:
    text: list[str] = []
    for part in parts:
        if isinstance(part, str):
            text.append(part)
        elif isinstance(part, dict):
            value = part.get("text") or part.get("content")
            if isinstance(value, str):
                text.append(value)
    return "".join(text)
