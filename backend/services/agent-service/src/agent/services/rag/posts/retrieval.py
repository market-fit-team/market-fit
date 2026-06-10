from __future__ import annotations

from agent.repositories.qdrant import get_qdrant_rag_repository
from agent.schemas.rag import PostSearchRequest, PostSearchResponse, PostSearchResult, RelatedPostsRequest
from agent.services.rag.embeddings import TextImageEmbedder, embed_search_query
from agent.services.rag.models import PostSearchHit, VectorPointNotFoundError
from agent.services.rag.sources.post.source import POST_SOURCE
from agent.services.rag.vectorstore import RagVectorStore, VectorSearchPoint


async def search_posts(
    payload: PostSearchRequest,
    *,
    embedding_client: TextImageEmbedder | None = None,
    vector_store: RagVectorStore | None = None,
) -> PostSearchResponse:
    # 검색어는 게시글 벡터와 같은 embedding model/dimension으로 변환한 뒤 Qdrant에서 비교합니다.
    vector = await embed_search_query(payload.query, embedding_client=embedding_client)
    vector_store = vector_store or get_qdrant_rag_repository()
    points = await vector_store.query_points(
        vector=vector,
        query_filter=POST_SOURCE.build_filter(
            visibility=payload.visibility,
            status=payload.status,
        ),
        limit=payload.limit,
        with_payload=list(POST_SOURCE.result_payload_fields),
    )
    return _to_response(_post_hits_from_points(points))


async def find_related_posts(
    post_id: int,
    payload: RelatedPostsRequest,
    *,
    vector_store: RagVectorStore | None = None,
) -> PostSearchResponse:
    vector_store = vector_store or get_qdrant_rag_repository()
    # 연관 게시글은 query text가 아니라 이미 색인된 게시글 벡터를 seed로 사용합니다.
    source_vector = await vector_store.retrieve_vector(point_id=POST_SOURCE.build_point_id(post_id))
    points = await vector_store.query_points(
        vector=source_vector,
        query_filter=POST_SOURCE.build_filter(
            visibility=payload.visibility,
            status=payload.status,
            exclude_post_id=post_id,
        ),
        limit=payload.limit,
        with_payload=list(POST_SOURCE.result_payload_fields),
    )
    return _to_response(_post_hits_from_points(points))


def _post_hits_from_points(points: list[VectorSearchPoint]) -> list[PostSearchHit]:
    hits: list[PostSearchHit] = []
    for point in points:
        post_id = point.payload.get("postId")
        if isinstance(post_id, int):
            hits.append(PostSearchHit(post_id=post_id, score=point.score))
    return hits


def _to_response(hits: list[PostSearchHit]) -> PostSearchResponse:
    return PostSearchResponse(
        results=[
            PostSearchResult(postId=hit.post_id, score=hit.score)
            for hit in hits
        ]
    )


__all__ = [
    "VectorPointNotFoundError",
    "find_related_posts",
    "search_posts",
]
