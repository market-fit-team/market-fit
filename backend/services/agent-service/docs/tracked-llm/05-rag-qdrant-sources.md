# 05. RAG, Qdrant, Sources

이 문서는 `llm`의 RAG 구조, Qdrant 운영 방식, 새 RAG source를 유지보수 가능하게 추가하는 방법을 설명한다.

## 핵심 원칙

```text
Qdrant repository는 source를 모른다.
source별 point id, payload, filter, result field는 source definition이 가진다.
payload index는 source registry에서 모아 Qdrant setup이 만든다.
```

이 원칙을 깨면 source가 늘어날수록 `repositories/qdrant.py`, `qdrant_setup.py`, retrieval service가 비대해진다.

## 현재 RAG 흐름

```text
POST /api/v1/rag/posts/index
  -> IndexPostRequest
  -> PostForIndexing
  -> embed_post_document()
  -> POST_SOURCE.build_point_id()
  -> POST_SOURCE.build_payload()
  -> RagVectorStore.upsert_point()
  -> Qdrant alias
```

검색:

```text
POST /api/v1/rag/posts/search
  -> PostSearchRequest
  -> embed_search_query()
  -> POST_SOURCE.build_filter()
  -> RagVectorStore.query_points()
  -> postId/score response
```

연관 게시글:

```text
POST /api/v1/rag/posts/{post_id}/related
  -> POST_SOURCE.build_point_id(post_id)
  -> RagVectorStore.retrieve_vector()
  -> POST_SOURCE.build_filter(exclude_post_id=post_id)
  -> RagVectorStore.query_points()
```

## Qdrant 설정

| 설정                      | 의미                                            |
| ------------------------- | ----------------------------------------------- |
| `QDRANT_URL`              | Qdrant endpoint                                 |
| `QDRANT_COLLECTION`       | 실제 collection 이름                            |
| `QDRANT_COLLECTION_ALIAS` | 서비스 코드가 사용하는 alias                    |
| `QDRANT_DISTANCE`         | distance metric                                 |
| `EMBEDDING_MODEL`         | payload에 기록되는 embedding model              |
| `EMBEDDING_DIMENSION`     | vector dimension과 payload에 기록되는 dimension |

현재 vector name은 고정값이다.

```text
embedding
```

`repositories/qdrant.py`의 `RAG_VECTOR_NAME`이 단일 출처다.

## Collection과 alias

서비스의 Qdrant read/write 코드는 실제 collection이 아니라 alias를 사용한다.

```text
collection: pickle_rag_embeddings_gemini2_768_v1
alias:      pickle_rag_embeddings_current
```

이유:

- embedding model 변경
- embedding dimension 변경
- schemaVersion 변경
- 대량 재색인
- 무중단 collection 교체

운영 패턴:

```text
1. 새 collection 이름을 정한다.
2. 새 설정으로 collection을 만든다.
3. 전체 데이터를 새 collection에 재색인한다.
4. 검증한다.
5. alias를 새 collection으로 전환한다.
6. 구 collection은 충분히 검증한 뒤 정리한다.
```

`EMBEDDING_DIMENSION`이 다른 vector를 기존 collection에 섞으면 안 된다.

## Qdrant setup

앱 lifespan에서 `ensure_qdrant_collection_and_alias()`를 호출한다.

```text
collection_exists(QDRANT_COLLECTION)
  -> 없으면 create_collection(named vector embedding)

payload_indexes_for_registered_sources()
  -> create_payload_index(...)

get_aliases()
  -> 기존 alias 삭제 operation
  -> 새 alias 생성 operation
  -> update_collection_aliases(...)
```

payload index 목록은 `qdrant_setup.py`에 하드코딩하지 않는다.  
반드시 source registry에서 가져온다.

## Vector store protocol

`services/rag/vectorstore.py`는 repository가 구현해야 할 최소 계약이다.

```text
upsert_point(point_id, vector, payload)
delete_point(point_id)
set_payload(point_id, payload)
retrieve_vector(point_id)
query_points(vector, query_filter, limit, with_payload)
```

`QdrantRagRepository`는 이 계약을 Qdrant로 구현한다.

금지:

```text
upsert_post
search_posts
find_related_posts
build_post_filter
set_post_status
```

이런 source-specific 동작은 source별 service와 source definition에 둔다.

## Source definition

Source definition은 source별 Qdrant 규칙의 단일 출처다.

현재 post source:

```text
services/rag/sources/post/source.py
```

담당:

- `source_type`
- `schema_version`
- `payload_indexes`
- `filter_field_names`
- `result_payload_fields`
- deterministic point id 생성
- payload 생성
- query filter 생성

현재 post payload index:

```text
sourceType: KEYWORD
visibility: KEYWORD
status: KEYWORD
postId: INTEGER
```

`sourceType`은 모든 source에 필요하다.  
여러 source가 같은 collection을 공유하므로 filter의 첫 조건으로 source를 분리한다.

## Registry validation

`services/rag/sources/registry.py`는 다음을 검증한다.

- source type 중복 금지
- 모든 source는 `sourceType` payload index를 가져야 함
- filter field는 반드시 payload index가 있어야 함
- 같은 field에 서로 다른 schema/is_tenant 정의 금지
- `sourceType`은 tenant index로 쓰지 않음

새 source를 추가했는데 validation이 실패하면, repository나 setup을 우회하지 말고 source definition을 고친다.

## 새 RAG source 추가 절차

예를 들어 `document` source를 추가한다면 다음 구조를 만든다.

```text
services/rag/sources/document/
├── __init__.py
└── source.py

services/rag/documents/
├── __init__.py
├── ingestion.py
└── retrieval.py
```

`source.py` 예시 성격:

```python
DOCUMENT_SOURCE_TYPE = "document"
DOCUMENT_SCHEMA_VERSION = 1

@dataclass(frozen=True)
class DocumentRagSourceDefinition:
    source_type: str = DOCUMENT_SOURCE_TYPE
    schema_version: int = DOCUMENT_SCHEMA_VERSION
    payload_indexes: tuple[PayloadIndexDefinition, ...] = (
        PayloadIndexDefinition("sourceType", models.PayloadSchemaType.KEYWORD),
        PayloadIndexDefinition("documentId", models.PayloadSchemaType.KEYWORD),
        PayloadIndexDefinition("workspaceId", models.PayloadSchemaType.KEYWORD, is_tenant=True),
        PayloadIndexDefinition("status", models.PayloadSchemaType.KEYWORD),
    )
    filter_field_names: tuple[str, ...] = ("sourceType", "documentId", "workspaceId", "status")
    result_payload_fields: tuple[str, ...] = ("documentId",)

    def build_point_id(self, document_id: str) -> str:
        ...

    def build_payload(self, document: DocumentForIndexing) -> dict[str, object]:
        ...

    def build_filter(...):
        ...
```

그 다음 registry에 등록한다.

```python
RAG_SOURCE_DEFINITIONS = (
    POST_SOURCE,
    DOCUMENT_SOURCE,
)
```

## 새 source 추가 체크리스트

- source type이 고유한가?
- deterministic point id namespace가 source별로 분리되어 있는가?
- payload에 `sourceType`, `sourceId`, `schemaVersion`이 들어가는가?
- filter에 쓰는 모든 field가 `payload_indexes`에 있는가?
- result로 필요한 field만 `result_payload_fields`에 들어가는가?
- embedding model/dimension metadata가 필요한가?
- source별 ingestion/retrieval service가 repository generic method만 호출하는가?
- `qdrant_setup.py`를 수정하지 않고 registry만 수정했는가?
- registry validation 테스트를 추가했는가?
- repository public surface가 source-agnostic인 테스트가 유지되는가?

## Post source 세부 규칙

Post source point id는 UUID v5로 만든다.

```text
namespace + "post:<post_id>" -> UUID
```

Qdrant가 임의 문자열 id를 받지 않는 전제를 고려해 deterministic UUID를 사용한다.

Post payload는 다음 성격의 값을 포함한다.

```text
sourceType
sourceId
schemaVersion
postId
authorId
visibility
status
createdAt
hasMedia
mediaCount
mediaAttachmentIds
embeddingModel
embeddingDimension
```

검색 응답에는 `postId`와 `score`만 반환한다.

## Embedding 입력 규칙

게시글 하나는 단일 vector 하나로 저장한다.

```text
text content + ordered image parts -> Gemini embedding -> one vector
```

정렬 규칙:

```text
(sort_order, attachment_id)
```

이 정렬은 재색인 시 같은 게시글이 같은 순서의 multimodal 입력을 갖도록 하기 위한 것이다.

검색 query는 다음 prefix로 embedding한다.

```text
Query: <query>
```

게시글 본문은 다음 prefix로 embedding한다.

```text
Document: <content>
```

## Signed URL media fetch

`SignedUrlMediaClient`는 Java server가 검증해서 넘긴 signed URL만 가져온다는 전제다.

규칙:

- `content_type`은 `image/*`만 허용한다.
- timeout은 `MEDIA_FETCH_TIMEOUT_SECONDS`를 따른다.
- fetch 실패는 `MediaFetchError`로 감싼다.
- embedding provider에는 bytes와 mime type을 같은 Part로 넘긴다.

임의 URL crawler나 비이미지 문서 fetcher로 확장하지 않는다.

## Status update

게시글 status 변경은 vector 의미를 바꾸지 않는다고 보고 payload만 갱신한다.

```text
PATCH /rag/posts/{post_id}/status
  -> set_payload({"status": status})
```

본문, 이미지, visibility처럼 검색 의미나 필터 정책에 영향을 주는 값이 바뀌면 재색인 필요 여부를 별도로 판단한다.

## Alias switch

```bash
uv run python scripts/qdrant_alias_switch.py <target_collection>
```

이 스크립트는 현재 `QDRANT_COLLECTION_ALIAS`를 target collection으로 전환한다.

주의:

- target collection의 vector dimension이 현재 서비스 설정과 맞아야 한다.
- payload index가 source registry 기준으로 준비되어 있어야 한다.
- alias 전환 전 sample query를 검증한다.
- 전환 후 구 collection 삭제는 즉시 하지 말고 rollback 가능 시간을 둔다.

## 절대 하지 말 것

- `repositories/qdrant.py`에 `postId` 같은 source-specific field를 박지 않는다.
- `qdrant_setup.py`에 payload index를 직접 추가하지 않는다.
- source별 filter를 retrieval service 곳곳에 문자열로 흩뿌리지 않는다.
- embedding dimension이 다른 vector를 같은 collection에 넣지 않는다.
- service 코드에서 alias 대신 실제 collection name을 직접 사용하지 않는다.
- Qdrant payload를 Java DB entity 대체물로 사용하지 않는다.
