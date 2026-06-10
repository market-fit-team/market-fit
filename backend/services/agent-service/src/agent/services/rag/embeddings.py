from __future__ import annotations

import asyncio
from typing import Protocol, Sequence

from google.genai import types

from agent.clients.gemini import GeminiEmbeddingClient, get_gemini_embedding_client
from agent.clients.http import SignedUrlMediaClient, get_signed_url_media_client
from agent.services.rag.models import PostForIndexing, PostMediaAttachment


class ImagePartFetcher(Protocol):
    async def fetch_image_part(self, *, signed_url: str, content_type: str) -> types.Part:
        raise NotImplementedError


class TextImageEmbedder(Protocol):
    async def embed_post(self, *, text: str | None, media_parts: Sequence[types.Part]) -> list[float]:
        raise NotImplementedError

    async def embed_query(self, query: str) -> list[float]:
        raise NotImplementedError


async def embed_post_document(
    post: PostForIndexing,
    *,
    media_client: ImagePartFetcher | None = None,
    embedding_client: TextImageEmbedder | None = None,
) -> list[float]:
    # 첨부 순서가 바뀌면 멀티모달 embedding 입력도 달라지므로 색인 전 항상 안정 정렬합니다.
    ordered_attachments = _sort_attachments(post.media_attachments)
    media_client = media_client or get_signed_url_media_client()
    embedding_client = embedding_client or get_gemini_embedding_client()

    # signed URL fetch는 병렬로 처리하되, asyncio.gather가 입력 순서를 보존하므로 정렬 결과가 유지됩니다.
    media_parts = await asyncio.gather(
        *[
            media_client.fetch_image_part(
                signed_url=attachment.signed_url,
                content_type=attachment.content_type,
            )
            for attachment in ordered_attachments
        ]
    )

    # 게시글 하나는 텍스트와 이미지들을 합친 단일 벡터 하나로 저장합니다.
    return await embedding_client.embed_post(
        text=post.content,
        media_parts=media_parts,
    )


async def embed_search_query(
    query: str,
    *,
    embedding_client: TextImageEmbedder | None = None,
) -> list[float]:
    embedding_client = embedding_client or get_gemini_embedding_client()
    return await embedding_client.embed_query(query)


def _sort_attachments(attachments: list[PostMediaAttachment]) -> list[PostMediaAttachment]:
    return sorted(attachments, key=lambda attachment: (attachment.sort_order, attachment.attachment_id))
