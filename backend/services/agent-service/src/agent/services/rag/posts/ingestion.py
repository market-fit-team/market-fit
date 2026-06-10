from __future__ import annotations

from agent.repositories.qdrant import get_qdrant_rag_repository
from agent.schemas.rag import IndexPostRequest
from agent.services.rag.embeddings import ImagePartFetcher, TextImageEmbedder, embed_post_document
from agent.services.rag.models import PostForIndexing, PostMediaAttachment
from agent.services.rag.sources.post.source import POST_SOURCE
from agent.services.rag.vectorstore import RagVectorStore


async def index_post(
    payload: IndexPostRequest,
    *,
    media_client: ImagePartFetcher | None = None,
    embedding_client: TextImageEmbedder | None = None,
    vector_store: RagVectorStore | None = None,
) -> None:
    # API schema를 post RAG 내부 모델로 바꾼 뒤 embedding과 vector store 작업을 조립합니다.
    post = _to_post_for_indexing(payload)
    vector = await embed_post_document(
        post,
        media_client=media_client,
        embedding_client=embedding_client,
    )
    vector_store = vector_store or get_qdrant_rag_repository()
    await vector_store.upsert_point(
        point_id=POST_SOURCE.build_point_id(post.post_id),
        vector=vector,
        payload=POST_SOURCE.build_payload(post),
    )


async def delete_post_index(
    post_id: int,
    *,
    vector_store: RagVectorStore | None = None,
) -> None:
    vector_store = vector_store or get_qdrant_rag_repository()
    await vector_store.delete_point(point_id=POST_SOURCE.build_point_id(post_id))


async def update_post_index_status(
    post_id: int,
    status: str,
    *,
    vector_store: RagVectorStore | None = None,
) -> None:
    # 상태 변경은 의미 벡터를 바꾸지 않으므로 재임베딩 없이 payload만 갱신합니다.
    vector_store = vector_store or get_qdrant_rag_repository()
    await vector_store.set_payload(point_id=POST_SOURCE.build_point_id(post_id), payload={"status": status})


def _to_post_for_indexing(payload: IndexPostRequest) -> PostForIndexing:
    # 동일 게시글을 다시 색인해도 이미지 입력 순서가 흔들리지 않게 여기서도 한 번 더 정렬합니다.
    ordered_attachments = sorted(
        payload.media_attachments,
        key=lambda attachment: (attachment.sort_order, attachment.attachment_id),
    )
    return PostForIndexing(
        post_id=payload.post_id,
        author_id=payload.author_id,
        content=payload.content,
        visibility=payload.visibility,
        status=payload.status,
        created_at=payload.created_at,
        media_attachments=[
            PostMediaAttachment(
                attachment_id=attachment.attachment_id,
                content_type=attachment.content_type,
                sort_order=attachment.sort_order,
                signed_url=attachment.signed_url,
            )
            for attachment in ordered_attachments
        ],
    )
