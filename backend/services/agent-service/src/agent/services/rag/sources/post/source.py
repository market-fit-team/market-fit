from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID, uuid5

from qdrant_client.http import models

from agent.core.config import settings
from agent.services.rag.models import PostForIndexing
from agent.services.rag.sources.base import PayloadIndexDefinition


POST_SOURCE_TYPE = "post"
POST_SCHEMA_VERSION = 1
RAG_POINT_NAMESPACE = UUID("4d4982cc-7b3f-5a6d-9a21-5f6f313f7ec4")


@dataclass(frozen=True)
class PostRagSourceDefinition:
    source_type: str = POST_SOURCE_TYPE
    schema_version: int = POST_SCHEMA_VERSION
    payload_indexes: tuple[PayloadIndexDefinition, ...] = (
        PayloadIndexDefinition("sourceType", models.PayloadSchemaType.KEYWORD),
        PayloadIndexDefinition("visibility", models.PayloadSchemaType.KEYWORD),
        PayloadIndexDefinition("status", models.PayloadSchemaType.KEYWORD),
        PayloadIndexDefinition("postId", models.PayloadSchemaType.INTEGER),
    )
    filter_field_names: tuple[str, ...] = ("sourceType", "visibility", "status", "postId")
    result_payload_fields: tuple[str, ...] = ("postId",)

    def build_point_id(self, post_id: int) -> str:
        # Qdrant는 임의 문자열 id를 받지 않으므로 source key를 deterministic UUID로 바꿉니다.
        return str(uuid5(RAG_POINT_NAMESPACE, f"{self.source_type}:{post_id}"))

    def build_payload(self, post: PostForIndexing) -> dict[str, object]:
        media_attachment_ids = [attachment.attachment_id for attachment in post.media_attachments]
        return {
            "sourceType": self.source_type,
            "sourceId": post.post_id,
            "schemaVersion": self.schema_version,
            "postId": post.post_id,
            "authorId": post.author_id,
            "visibility": post.visibility,
            "status": post.status,
            "createdAt": _isoformat(post.created_at),
            "hasMedia": bool(media_attachment_ids),
            "mediaCount": len(media_attachment_ids),
            "mediaAttachmentIds": media_attachment_ids,
            "embeddingModel": settings.embedding_model,
            "embeddingDimension": settings.embedding_dimension,
        }

    def build_filter(
        self,
        *,
        visibility: str | None = None,
        status: str | None = None,
        exclude_post_id: int | None = None,
    ) -> models.Filter:
        must: list[models.Condition] = [
            models.FieldCondition(
                key="sourceType",
                match=models.MatchValue(value=self.source_type),
            )
        ]
        must_not: list[models.Condition] = []

        if visibility is not None:
            must.append(
                models.FieldCondition(
                    key="visibility",
                    match=models.MatchValue(value=visibility),
                )
            )
        if status is not None:
            must.append(
                models.FieldCondition(
                    key="status",
                    match=models.MatchValue(value=status),
                )
            )
        if exclude_post_id is not None:
            must_not.append(
                models.FieldCondition(
                    key="postId",
                    match=models.MatchValue(value=exclude_post_id),
                )
            )

        return models.Filter(must=must, must_not=must_not or None)


def _isoformat(value: datetime) -> str:
    return value.isoformat()


POST_SOURCE = PostRagSourceDefinition()
