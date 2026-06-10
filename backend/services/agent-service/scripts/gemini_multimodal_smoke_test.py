from __future__ import annotations

"""실제 Gemini 멀티모달 임베딩 provider를 확인하는 수동 smoke 스크립트입니다.

외부 Gemini API를 실제로 호출하므로 pytest, CI, FastAPI 시작 흐름에 넣지 않습니다.
GEMINI_API_KEY가 설정된 로컬/운영 점검 환경에서만 실행하고, 의도하지 않은 provider
호출을 막기 위해 RUN_GEMINI_SMOKE=1을 설정한 경우에만 동작하게 둡니다.
"""

import asyncio
import base64
import os

from google import genai
from google.genai import types

from agent.core.config import settings


TINY_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8"
    "/w8AAn8B9pWf6QAAAABJRU5ErkJggg=="
)


async def main() -> None:
    if os.getenv("RUN_GEMINI_SMOKE") != "1":
        print("RUN_GEMINI_SMOKE가 1이 아니므로 Gemini smoke test를 건너뜁니다.")
        return

    if not settings.gemini_api_key:
        raise RuntimeError("Gemini smoke test에는 GEMINI_API_KEY가 필요합니다.")

    client = genai.Client(api_key=settings.gemini_api_key)
    image_bytes = base64.b64decode(TINY_PNG_BASE64)

    response = await client.aio.models.embed_content(
        model=settings.embedding_model,
        contents=types.UserContent(
            parts=[
                types.Part.from_text(text="작은 투명 png 테스트"),
                types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
            ]
        ),
        config=types.EmbedContentConfig(
            output_dimensionality=settings.embedding_dimension,
        ),
    )

    embeddings = response.embeddings or []
    if len(embeddings) != 1 or not embeddings[0].values:
        raise RuntimeError("Gemini smoke test가 embedding을 반환하지 않았습니다.")

    print(f"Smoke test가 성공했습니다. embedding_dimension={len(embeddings[0].values)}")


if __name__ == "__main__":
    asyncio.run(main())
