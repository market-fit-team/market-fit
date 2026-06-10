from __future__ import annotations

from functools import lru_cache

import httpx
from google.genai import types

from agent.core.config import settings
from agent.services.rag.models import MediaFetchError, UnsupportedMediaTypeError


class SignedUrlMediaClient:
    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client or _build_http_client()

    async def fetch_image_part(self, *, signed_url: str, content_type: str) -> types.Part:
        # Java 서버가 검증한 signed URL만 받는 전제이며, Python은 embedding 가능한 image/*만 허용합니다.
        if not content_type.startswith("image/"):
            raise UnsupportedMediaTypeError(f"embedding에 지원하지 않는 media type입니다: {content_type}")

        try:
            response = await self._client.get(signed_url)
            response.raise_for_status()
        except httpx.TimeoutException as error:
            raise MediaFetchError("signed media URL을 가져오는 중 timeout이 발생했습니다.") from error
        except httpx.HTTPError as error:
            raise MediaFetchError("signed media URL을 가져오지 못했습니다.") from error

        # Gemini SDK에 넘길 수 있도록 bytes와 mime type을 같은 Part에 묶습니다.
        return types.Part.from_bytes(data=response.content, mime_type=content_type)


@lru_cache
def _build_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        follow_redirects=True,
        timeout=settings.media_fetch_timeout_seconds,
    )


@lru_cache
def get_signed_url_media_client() -> SignedUrlMediaClient:
    return SignedUrlMediaClient()
