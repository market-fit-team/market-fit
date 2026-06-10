"""llm 채팅 스트림 API를 위한 HTTP 클라이언트.

이 파일은 이 저장소의 고유 파일입니다.
``llm/docs/03-api-contract.md``에 명시된 로컬 API 규약을 따릅니다:
- ``POST /api/v1/chat/stream-sessions``
- ``GET /api/v1/chat/stream-sessions/{session_id}/events``
- ``POST /api/v1/chat/threads/{thread_id}/resume``
"""

from __future__ import annotations

import os
from typing import Any

import httpx

from evals.agent_eval.models import RunnerConfig, StreamRecord, Turn
from evals.agent_eval.sse import SseParser


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
            headers=self._headers(),
            json=payload,
        )
        response.raise_for_status()
        return str(response.json()["thread_id"])

    async def stream_run(self, thread_id: str, payload: dict[str, Any]) -> list[StreamRecord]:
        parser = SseParser()
        records: list[StreamRecord] = []
        async with self._client.stream(
            "POST",
            f"/api/v1/langgraph/threads/{thread_id}/runs/stream",
            headers=self._headers(),
            json=payload,
        ) as response:
            response.raise_for_status()
            async for chunk in response.aiter_text():
                records.extend(parser.feed(chunk))
        records.extend(parser.flush())
        return records

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "text/event-stream"}
        if self._api_key:
            headers[self._runner.api_key_header] = self._api_key
        return headers
