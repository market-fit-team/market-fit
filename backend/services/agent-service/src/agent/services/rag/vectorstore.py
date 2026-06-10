from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from qdrant_client.http import models


@dataclass(frozen=True)
class VectorSearchPoint:
    payload: dict[str, object]
    score: float


class RagVectorStore(Protocol):
    async def upsert_point(self, *, point_id: str, vector: list[float], payload: dict[str, object]) -> None:
        raise NotImplementedError

    async def delete_point(self, *, point_id: str) -> None:
        raise NotImplementedError

    async def set_payload(self, *, point_id: str, payload: dict[str, object]) -> None:
        raise NotImplementedError

    async def retrieve_vector(self, *, point_id: str) -> list[float]:
        raise NotImplementedError

    async def query_points(
        self,
        *,
        vector: list[float],
        query_filter: models.Filter,
        limit: int,
        with_payload: list[str],
    ) -> list[VectorSearchPoint]:
        raise NotImplementedError
