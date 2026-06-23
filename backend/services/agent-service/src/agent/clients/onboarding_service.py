from __future__ import annotations

from typing import Any

import httpx

from agent.core.config import settings


class OnboardingServiceClient:
    async def _request(
        self,
        method: str,
        path: str,
        *,
        access_token: str | None = None,
        json: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        headers = (
            {"authorization": f"Bearer {access_token}"} if access_token is not None else None
        )
        async with httpx.AsyncClient(
            base_url=settings.onboarding_service_url,
            timeout=settings.service_request_timeout_seconds,
        ) as client:
            response = await client.request(
                method, path, headers=headers, json=json, params=params
            )
            response.raise_for_status()
            body = response.json()
        if not isinstance(body, dict):
            raise RuntimeError("onboarding-service 응답 형식이 올바르지 않습니다.")
        return body

    async def get_default_profile(self, access_token: str) -> dict[str, Any] | None:
        try:
            return await self._request(
                "GET", "/surveys/me/profile", access_token=access_token
            )
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                return None
            raise

    async def get_survey_result(self, result_code: str) -> dict[str, Any]:
        return await self._request("GET", f"/surveys/results/{result_code}")

    async def get_area_recommendations(
        self, result_code: str, category_code: str, top_k: int
    ) -> dict[str, Any]:
        return await self._request(
            "GET",
            f"/surveys/results/{result_code}/area-recommendations",
            params={"category_code": category_code, "top_k": top_k},
        )

    async def preview_profile_update(
        self, access_token: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/surveys/me/profile/preview-update",
            access_token=access_token,
            json=payload,
        )

    async def commit_profile_update(
        self, access_token: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        return await self._request(
            "POST",
            "/surveys/me/profile/commit-update",
            access_token=access_token,
            json=payload,
        )


onboarding_service_client = OnboardingServiceClient()
