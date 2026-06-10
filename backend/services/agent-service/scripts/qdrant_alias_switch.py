from __future__ import annotations

"""RAG collection 교체 시 Qdrant alias를 전환하는 수동 운영 스크립트입니다.

embedding model/dimension 변경이나 전체 재색인 후 새 Qdrant collection을 만들고
검증한 다음 실행합니다. FastAPI 앱은 QDRANT_COLLECTION_ALIAS를 통해 읽고 쓰므로,
이 작업은 앱 시작 시 자동 실행하지 않고 의도적으로 수행하는 운영 단계로 둡니다.
"""

import argparse
import asyncio

from qdrant_client.http import models

from agent.clients.qdrant import get_qdrant_client
from agent.core.config import settings


async def main() -> None:
    parser = argparse.ArgumentParser(description="활성 Qdrant alias를 다른 collection으로 전환합니다.")
    parser.add_argument("collection", help="활성 alias가 바라볼 대상 collection 이름입니다.")
    args = parser.parse_args()

    client = get_qdrant_client()
    aliases = await client.get_aliases()
    operations: list[models.CreateAliasOperation | models.DeleteAliasOperation] = []
    for alias in aliases.aliases:
        if alias.alias_name == settings.qdrant_collection_alias:
            operations.append(
                models.DeleteAliasOperation(
                    delete_alias=models.DeleteAlias(alias_name=settings.qdrant_collection_alias)
                )
            )
            break

    operations.append(
        models.CreateAliasOperation(
            create_alias=models.CreateAlias(
                collection_name=args.collection,
                alias_name=settings.qdrant_collection_alias,
            )
        )
    )

    await client.update_collection_aliases(change_aliases_operations=operations)
    print(f"alias={settings.qdrant_collection_alias}를 collection={args.collection}으로 전환했습니다.")


if __name__ == "__main__":
    asyncio.run(main())
