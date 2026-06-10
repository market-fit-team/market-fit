"""Protocol V2 기반 LangGraph Agent Server eval HTTP 클라이언트.

이 파일은 프로덕션 프론트엔드가 아니라 평가 하네스입니다. 프론트엔드는 공식
``@langchain/react`` transport를 사용하고, eval은 서버가 V2 endpoint를 실제로
노출하는지 검증하기 위해 HTTP/SSE를 직접 호출합니다.

근거:
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- https://docs.langchain.com/langsmith/agent-server-changelog
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

import httpx

from evals.agent_eval.models import RunnerConfig, StreamRecord
from evals.agent_eval.sse import SseParser, is_terminal_protocol_event

PROTOCOL_V2_CHANNELS = [
    "values",
    "messages",
    "tools",
    "input",
    "lifecycle",
    "updates",
]


class LlmEvalClient:
    def __init__(self, runner: RunnerConfig) -> None:
        self._runner = runner
        self._api_key = os.environ.get(runner.api_key_env)
        self._client = httpx.AsyncClient(base_url=runner.base_url, timeout=runner.timeout_seconds)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def create_thread(self, *, thread_id: str | None) -> str:
        payload = {}
        if thread_id is not None:
            payload["thread_id"] = thread_id

        response = await self._client.post(
            "/api/v1/langgraph/threads",
            headers=self._headers(accept="application/json"),
            json=payload,
        )
        response.raise_for_status()
        return str(response.json()["thread_id"])

    async def stream_run(self, thread_id: str, payload: dict[str, Any]) -> list[StreamRecord]:
        command = self._build_run_start_command(payload)
        return await self._stream_command(thread_id=thread_id, command=command)

    async def stream_response(
        self,
        *,
        thread_id: str,
        interrupt_id: str,
        namespace: list[str],
        response_value: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> list[StreamRecord]:
        params: dict[str, Any] = {
            "namespace": namespace,
            "interrupt_id": interrupt_id,
            "response": response_value,
        }
        if context:
            params["config"] = {"configurable": context}

        command = {
            "id": 2,
            "method": "input.respond",
            "params": params,
        }
        return await self._stream_command(thread_id=thread_id, command=command)

    async def _stream_command(self, *, thread_id: str, command: dict[str, Any]) -> list[StreamRecord]:
        parser = SseParser()
        records: list[StreamRecord] = []

        # Protocol V2는 관찰 스트림(/stream/events)과 명령(/commands)이 분리됩니다.
        # SSE 연결을 먼저 열어두고 run.start/input.respond 명령을 보내야 초기 이벤트를 놓치지 않습니다.
        # 근거:
        # https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
        # https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
        async with self._client.stream(
            "POST",
            f"/api/v1/langgraph/threads/{thread_id}/stream/events",
            headers=self._headers(accept="text/event-stream"),
            json={"channels": PROTOCOL_V2_CHANNELS, "namespaces": [[]], "depth": 20, "since": 0},
        ) as response:
            response.raise_for_status()
            command_task = asyncio.create_task(self._send_command(thread_id=thread_id, command=command))

            async for chunk in response.aiter_text():
                records.extend(parser.feed(chunk))
                if any(is_terminal_protocol_event(record) for record in records):
                    break

            await command_task

        records.extend(parser.flush())
        if not records or records[-1].event != "done":
            records.append(StreamRecord(event="done", data={}, raw=""))
        return records

    async def _send_command(self, *, thread_id: str, command: dict[str, Any]) -> dict[str, Any]:
        response = await self._client.post(
            f"/api/v1/langgraph/threads/{thread_id}/commands",
            headers=self._headers(accept="application/json"),
            json=command,
        )
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, dict) else {"value": payload}

    def _build_run_start_command(self, payload: dict[str, Any]) -> dict[str, Any]:
        params: dict[str, Any] = {
            "assistant_id": payload.get("assistant_id", "chat"),
            "input": payload.get("input"),
        }
        context = payload.get("context")
        if isinstance(context, dict) and context:
            params["config"] = {"configurable": context}

        return {
            "id": 1,
            "method": "run.start",
            "params": params,
        }

    def _headers(self, *, accept: str) -> dict[str, str]:
        headers = {"Accept": accept}
        if self._api_key:
            headers[self._runner.api_key_header] = self._api_key
        return headers
