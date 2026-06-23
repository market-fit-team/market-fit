from __future__ import annotations

from typing import Any, Protocol

import httpx

from agent.core.config import settings


class ThreadCreator(Protocol):
    async def create_thread(self, *, access_token: str, owner: str) -> str: ...


class AgentServerClient:
    async def create_thread(self, *, access_token: str, owner: str) -> str:
        headers = {"authorization": f"Bearer {access_token}"}
        payload = {"metadata": {"owner": owner}}
        async with httpx.AsyncClient(
            base_url=settings.agent_server_internal_url,
            timeout=settings.service_request_timeout_seconds,
        ) as client:
            response = await client.post("/threads", headers=headers, json=payload)
            response.raise_for_status()
            body: Any = response.json()
        thread_id = body.get("thread_id") if isinstance(body, dict) else None
        if not isinstance(thread_id, str) or not thread_id:
            raise RuntimeError("Agent Server가 thread_id를 반환하지 않았습니다.")
        return thread_id


agent_server_client = AgentServerClient()
