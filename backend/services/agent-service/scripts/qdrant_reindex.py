from __future__ import annotations

"""게시글 RAG 문서를 JSONL 입력으로 재색인하는 수동 운영 스크립트입니다.

입력 파일의 비어 있지 않은 각 줄은 POST /api/v1/rag/posts/index와 같은
IndexPostRequest JSON payload여야 합니다. 대량 재색인도 API 경로와 동일한
embedding, media 정렬, point-id, payload 규칙을 따르도록 post ingestion service를
직접 호출합니다.
"""

import argparse
import asyncio

from agent.schemas.rag import IndexPostRequest
from agent.services.rag.posts.ingestion import index_post


async def main() -> None:
    parser = argparse.ArgumentParser(description="JSONL 파일의 게시글 문서를 Qdrant에 재색인합니다.")
    parser.add_argument("input", help="/internal/index/posts payload가 담긴 JSONL 파일 경로입니다.")
    args = parser.parse_args()

    count = 0
    with open(args.input, "r", encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if not stripped:
                continue
            payload = IndexPostRequest.model_validate_json(stripped)
            await index_post(payload)
            count += 1

    print(f"게시글 {count}건을 재색인했습니다.")


if __name__ == "__main__":
    asyncio.run(main())
