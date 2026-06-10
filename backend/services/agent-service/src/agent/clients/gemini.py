from __future__ import annotations

from functools import lru_cache
from typing import Any, Sequence

from google import genai
from google.genai import types

from agent.core.config import settings
from agent.services.rag.models import EmbeddingProviderError


class GeminiEmbeddingClient:
    def __init__(self, client: Any | None = None) -> None:
        self._client = client or _build_gemini_client()

    async def embed_post(self, *, text: str | None, media_parts: Sequence[types.Part]) -> list[float]:
        parts: list[types.Part] = []
        if text is not None and text.strip():
            # 문서 벡터와 검색어 벡터가 같은 공간에서 비교되도록 입력 의도를 짧게 표시합니다.
            parts.append(types.Part.from_text(text=f"문서: {text.strip()}"))
        parts.extend(media_parts)
        return await self._embed_parts(parts)

    async def embed_query(self, query: str) -> list[float]:
        # 게시글 본문과 동일 모델을 쓰되, query 입력임을 명시해 검색 벡터로 사용합니다.
        return await self._embed_parts([types.Part.from_text(text=f"검색어: {query.strip()}")])

    async def _embed_parts(self, parts: Sequence[types.Part]) -> list[float]:
        if not settings.gemini_api_key:
            raise EmbeddingProviderError("GEMINI_API_KEY가 설정되지 않았습니다.")
        if not parts:
            raise EmbeddingProviderError("embedding에는 content part가 하나 이상 필요합니다.")

        try:
            # Gemini Embedding 2는 task_type 대신 한 content 안의 text/image parts를 단일 벡터로 집계합니다.
            content = types.UserContent(parts=list(parts))
            response = await self._client.aio.models.embed_content(
                model=settings.embedding_model,
                contents=content,
                config=types.EmbedContentConfig(
                    output_dimensionality=settings.embedding_dimension,
                ),
            )
        except Exception as error:  # pragma: no cover - SDK error surface is external
            raise EmbeddingProviderError("Gemini embedding 요청에 실패했습니다.") from error

        embeddings = response.embeddings or []
        if len(embeddings) != 1 or not embeddings[0].values:
            raise EmbeddingProviderError("Gemini embedding 응답에 단일 vector가 없습니다.")

        # Qdrant에는 SDK 객체가 아니라 순수 float list만 넘겨 repository 계층을 단순하게 유지합니다.
        return [float(value) for value in embeddings[0].values]


@lru_cache
def _build_gemini_client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


@lru_cache
def get_gemini_embedding_client() -> GeminiEmbeddingClient:
    return GeminiEmbeddingClient()
