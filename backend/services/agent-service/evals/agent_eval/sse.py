"""llm 채팅 스트림을 위한 SSE 파싱 헬퍼 함수.

이 파일은 이 저장소의 고유 파일입니다.
``src/services/chat/events.py`` 에서 노출하는 SSE 규약을 대상으로 하며, Goose나 Cline에서 파생되지 않았습니다.
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
        elif event.event == "on_tool_start":
            name = event.data.get("name", "unknown")
            args = event.data.get("data", {}).get("input", {})
            chunks.append(f"\n\n[Tool Call: {name}]\n> Arguments: {args}\n\n")
    return "".join(chunks).strip()


def interrupt_values(events: list[StreamRecord]) -> list[dict[str, Any]]:
    values: list[dict[str, Any]] = []
    for event in events:
        if event.event != "on_chain_stream":
            continue
        chunk = event.data.get("data", {}).get("chunk", {})
        interrupts = chunk.get("__interrupt__") if isinstance(chunk, dict) else None
        if not isinstance(interrupts, list):
            continue
        for interrupt in interrupts:
            if isinstance(interrupt, dict):
                value = interrupt.get("value")
                if isinstance(value, dict):
                    values.append(value)
    return values


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

