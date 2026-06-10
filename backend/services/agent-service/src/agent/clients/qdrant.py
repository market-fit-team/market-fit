from __future__ import annotations

from functools import lru_cache

from qdrant_client import AsyncQdrantClient

from agent.core.config import settings


@lru_cache
def get_qdrant_client() -> AsyncQdrantClient:
    return AsyncQdrantClient(url=settings.qdrant_url)

