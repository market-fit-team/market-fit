from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from agent.core.exceptions import AppException


class RagError(AppException):
    """RAG 색인과 조회 실패의 기본 예외입니다."""


class EmbeddingProviderError(RagError):
    """embedding provider가 vector를 만들지 못할 때 발생합니다."""


class MediaFetchError(RagError):
    """signed media URL을 가져오지 못할 때 발생합니다."""


class UnsupportedMediaTypeError(MediaFetchError):
    """이미지가 아닌 payload가 image embedder에 전달될 때 발생합니다."""


class VectorStoreError(RagError):
    """vector store가 요청 작업을 수행하지 못할 때 발생합니다."""


class VectorPointNotFoundError(VectorStoreError):
    """source vector를 찾을 수 없을 때 발생합니다."""


@dataclass(frozen=True)
class PostMediaAttachment:
    attachment_id: int
    content_type: str
    sort_order: int
    signed_url: str


@dataclass(frozen=True)
class PostForIndexing:
    post_id: int
    author_id: int
    content: str | None
    visibility: str
    status: str
    created_at: datetime
    media_attachments: list[PostMediaAttachment]


@dataclass(frozen=True)
class PostSearchHit:
    post_id: int
    score: float
