from __future__ import annotations

from qdrant_client.http import models

from agent.clients.qdrant import get_qdrant_client
from agent.core.config import settings
from agent.repositories.qdrant import RAG_VECTOR_NAME, get_qdrant_distance
from agent.services.rag.sources.registry import payload_indexes_for_registered_sources, qdrant_field_schema


async def ensure_qdrant_collection_and_alias() -> None:
    client = get_qdrant_client()

    exists = await client.collection_exists(settings.qdrant_collection)
    if not exists:
        # RAG source가 늘어나도 같은 collection을 쓰고 sourceType payload로 분리합니다.
        await client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config={
                RAG_VECTOR_NAME: models.VectorParams(
                    size=settings.embedding_dimension,
                    distance=get_qdrant_distance(),
                )
            },
        )

    # 검색 필터에 직접 쓰는 필드는 source definition registry에서 단일 출처로 관리합니다.
    for index in payload_indexes_for_registered_sources():
        await client.create_payload_index(
            collection_name=settings.qdrant_collection,
            field_name=index.field_name,
            field_schema=qdrant_field_schema(index),
        )

    aliases = await client.get_aliases()
    operations: list[models.CreateAliasOperation | models.DeleteAliasOperation] = []
    for alias in aliases.aliases:
        if alias.alias_name == settings.qdrant_collection_alias:
            # alias 스위치는 덮어쓰기보다 delete + create가 명시적이라 운영 추적이 쉽습니다.
            operations.append(
                models.DeleteAliasOperation(
                    delete_alias=models.DeleteAlias(alias_name=settings.qdrant_collection_alias)
                )
            )
            break

    operations.append(
        models.CreateAliasOperation(
            create_alias=models.CreateAlias(
                collection_name=settings.qdrant_collection,
                alias_name=settings.qdrant_collection_alias,
            )
        )
    )
    await client.update_collection_aliases(change_aliases_operations=operations)
