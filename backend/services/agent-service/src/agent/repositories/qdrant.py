from __future__ import annotations

from functools import lru_cache
from typing import Any

from qdrant_client.http import models

from agent.clients.qdrant import get_qdrant_client
from agent.core.config import settings
from agent.services.rag.models import VectorPointNotFoundError, VectorStoreError
from agent.services.rag.vectorstore import VectorSearchPoint


RAG_VECTOR_NAME = "embedding"


def get_qdrant_distance() -> models.Distance:
    mapping = {
        "COSINE": models.Distance.COSINE,
        "DOT": models.Distance.DOT,
        "EUCLID": models.Distance.EUCLID,
        "MANHATTAN": models.Distance.MANHATTAN,
    }
    normalized = settings.qdrant_distance.strip().upper()
    try:
        return mapping[normalized]
    except KeyError as error:
        raise ValueError(f"지원하지 않는 Qdrant distance입니다: {settings.qdrant_distance}") from error


class QdrantRagRepository:
    def __init__(self, client: Any) -> None:
        self._client = client

    async def upsert_point(self, *, point_id: str, vector: list[float], payload: dict[str, object]) -> None:
        # named vector를 쓰면 이후 같은 point에 다른 vector 종류를 추가할 여지를 남길 수 있습니다.
        point = models.PointStruct(
            id=point_id,
            vector={RAG_VECTOR_NAME: vector},
            payload=payload,
        )
        try:
            # 서비스는 alias를 바라보게 해서 collection 교체를 재배포 없이 alias switch로 처리합니다.
            await self._client.upsert(
                collection_name=settings.qdrant_collection_alias,
                points=[point],
                wait=True,
            )
        except Exception as error:  # pragma: no cover - client error surface is external
            raise VectorStoreError("Qdrant에 vector point를 upsert하지 못했습니다.") from error

    async def delete_point(self, *, point_id: str) -> None:
        try:
            await self._client.delete(
                collection_name=settings.qdrant_collection_alias,
                points_selector=models.PointIdsList(points=[point_id]),
                wait=True,
            )
        except Exception as error:  # pragma: no cover - client error surface is external
            raise VectorStoreError("Qdrant에서 vector point를 삭제하지 못했습니다.") from error

    async def set_payload(self, *, point_id: str, payload: dict[str, object]) -> None:
        try:
            await self._client.set_payload(
                collection_name=settings.qdrant_collection_alias,
                payload=payload,
                points=[point_id],
                wait=True,
            )
        except Exception as error:  # pragma: no cover - client error surface is external
            raise VectorStoreError("Qdrant vector point payload를 갱신하지 못했습니다.") from error

    async def retrieve_vector(self, *, point_id: str) -> list[float]:
        try:
            records = await self._client.retrieve(
                collection_name=settings.qdrant_collection_alias,
                ids=[point_id],
                with_payload=False,
                with_vectors=[RAG_VECTOR_NAME],
            )
        except Exception as error:  # pragma: no cover - client error surface is external
            raise VectorStoreError("Qdrant에서 vector를 조회하지 못했습니다.") from error

        if not records:
            raise VectorPointNotFoundError(f"색인된 vector point를 찾을 수 없습니다. pointId={point_id}")

        vector = records[0].vector
        if isinstance(vector, dict):
            named_vector = vector.get(RAG_VECTOR_NAME)
            if isinstance(named_vector, list):
                return [float(value) for value in named_vector]
        if isinstance(vector, list):
            return [float(value) for value in vector]

        raise VectorStoreError("조회된 post vector의 형태가 예상과 다릅니다.")

    async def query_points(
        self,
        *,
        vector: list[float],
        query_filter: models.Filter,
        limit: int,
        with_payload: list[str],
    ) -> list[VectorSearchPoint]:
        try:
            response = await self._client.query_points(
                collection_name=settings.qdrant_collection_alias,
                query=vector,
                using=RAG_VECTOR_NAME,
                query_filter=query_filter,
                limit=limit,
                with_payload=with_payload,
                with_vectors=False,
            )
        except Exception as error:  # pragma: no cover - client error surface is external
            raise VectorStoreError("Qdrant에서 vector point를 query하지 못했습니다.") from error

        points: list[VectorSearchPoint] = []
        for point in response.points:
            points.append(VectorSearchPoint(payload=dict(point.payload or {}), score=float(point.score)))
        return points


@lru_cache
def get_qdrant_rag_repository() -> QdrantRagRepository:
    return QdrantRagRepository(client=get_qdrant_client())
