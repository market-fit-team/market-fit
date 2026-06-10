# 08. Development Guide

이 문서는 `llm`에 새 기능을 추가할 때 따라야 하는 절차와 리뷰 체크리스트다.

## 작업 전 확인 순서

1. `AGENTS.md`를 읽는다.
2. 관련 문서를 확인한다.
3. 기존 테스트에서 같은 경계를 어떻게 검증하는지 본다.
4. 새 파일이 어느 계층에 속하는지 먼저 결정한다.
5. 구현 후 `uv run pytest`와 `uv run pyrefly check`를 실행한다.

## 새 LangGraph API 추가

새 chat/LangGraph endpoint를 추가할 때는 다음을 확인한다.

```text
src/api/endpoints/v1/langgraph.py
src/schemas/langgraph.py
src/services/chat/langgraph_protocol/**
src/services/chat/**
tests/api/v1/test_langgraph.py
tests/services/chat/langgraph_protocol/**
```

규칙:

- API path는 `/api/v1/langgraph/**` 아래에 둔다.
- 보호 endpoint는 API key dependency를 유지한다.
- request/response shape는 `schemas/langgraph.py`에 둔다.
- LangGraph 실행 세부는 endpoint에 직접 넣지 않는다.
- thread/run lifecycle은 `run_registry`와 `thread_store` 경계를 통한다.
- stream 변환은 `sdk_stream_adapter.py`에 모은다.
- SDK 호환 event/data shape 변경은 client 영향까지 같이 본다.
- `/api/v1/chat/stream-sessions` one-shot session API를 되살리지 않는다.

## 새 agent tool 추가

새 tool은 다음 흐름으로 추가한다.

```text
services/chat/tools/<tool_domain>_tool/
  -> @tool 함수
  -> ToolSpec
  -> __init__.py export

services/chat/toolkits/chat_toolkit.py
  -> ToolSpec tuple 등록

tests/services/chat/
  -> registry / policy / execution 테스트
```

ToolSpec 작성 시 결정할 것:

| 항목 | 질문 |
| ---- | ---- |
| `name` | snake_case이고 model/client가 이해하기 쉬운가? |
| `description` | client policy UI와 approval card에서 이해 가능한가? |
| `category` | 기존 category 중 맞는가? 새 category가 필요한가? |
| `args_schema` | edit decision이 안전하게 수정할 수 있는가? |
| `default_allowed` | 사람 승인 없이 실행해도 되는가? |
| `allowed_decisions` | approve/edit/reject/respond 중 무엇을 열어야 하는가? |

위험한 tool은 기본적으로 다음처럼 둔다.

```python
ToolSpec(
    ...,
    default_allowed=False,
    allowed_decisions=["approve", "reject"],
)
```

`edit`을 열면 사람이 args를 바꿀 수 있으므로 schema와 validation이 더 중요하다.

## 새 HITL 정책 추가

approval 정책을 바꿀 때는 다음 파일을 함께 본다.

```text
schemas/chat.py
services/chat/approvals/schemas.py
services/chat/approvals/policy.py
services/chat/approvals/nodes.py
services/chat/approvals/messages.py
services/chat/langgraph_protocol/sdk_stream_adapter.py
client/src/features/llm-chat/**
```

주의:

- API schema와 internal TypedDict shape가 어긋나면 client resume이 깨진다.
- public interrupt payload는 `action_requests`와 `review_configs`를 기준으로 한다.
- `review_configs`는 `action_name`과 `allowed_decisions`를 제공한다.
- resume decision은 `tool_call_id`가 아니라 승인 대상 action 순서로 매칭한다.
- edit decision field는 `editedAction`이다.
- 여러 tool call 중 승인 대상이 아닌 tool은 decision index를 소비하지 않는다.
- decision 누락 시 안전한 ToolMessage를 만들어야 한다.
- HITL resume은 새 `HumanMessage`가 아니라 `Command(resume=...)`다.

## LangGraph SDK stream adapter 수정

stream shape를 바꿀 때는 다음 파일을 함께 본다.

```text
services/chat/langgraph_protocol/sdk_stream_adapter.py
services/chat/langgraph_protocol/stream_serializer.py
services/chat/langgraph_protocol/json.py
tests/services/chat/langgraph_protocol/test_sdk_stream_adapter.py
tests/services/chat/langgraph_protocol/test_sdk_stream_adapter_tools.py
tests/services/chat/langgraph_protocol/test_json.py
```

체크할 것:

- `chat_graph.astream(..., version="v2")` StreamPart shape를 유지하는가?
- `type`이 SSE event name으로 매핑되는가?
- namespace가 pipe suffix로 보존되는가?
- `values.interrupts`가 `__interrupt__`로 보존되는가?
- `tools` payload가 SDK의 `on_tool_*` event로 변환되는가?
- LangChain message가 constructor envelope 없이 JSON 직렬화되는가?
- `Last-Event-ID` replay와 event id 증가가 깨지지 않는가?

## 새 RAG post 기능 추가

post source 기능을 확장할 때는 다음 위치를 우선 확인한다.

```text
schemas/rag.py
api/endpoints/v1/rag_posts.py
services/rag/posts/ingestion.py
services/rag/posts/retrieval.py
services/rag/sources/post/source.py
repositories/qdrant.py
```

규칙:

- post-specific 로직은 `services/rag/posts`와 `sources/post`에 둔다.
- Qdrant repository에는 generic vector operation만 둔다.
- 검색 filter field를 늘리면 `POST_SOURCE.payload_indexes`와 `filter_field_names`를 같이 수정한다.
- API 응답에 post 본문이나 권한 판단 결과를 넣지 않는다.

## 새 RAG source 추가

새 source를 추가할 때는 post source를 복사하되 이름만 바꾸지 말고 경계를 유지한다.

권장 구조:

```text
services/rag/sources/<source>/source.py
services/rag/<sources>/ingestion.py
services/rag/<sources>/retrieval.py
```

등록:

```text
services/rag/sources/registry.py
```

추가할 테스트:

```text
tests/services/rag/test_sources.py
tests/services/rag/test_<source>_ingestion.py
tests/services/rag/test_<source>_retrieval.py
```

하지 말 것:

- `repositories/qdrant.py`에 source별 메서드 추가
- `qdrant_setup.py`에 source별 index 하드코딩
- 기존 `posts` service에 다른 source 분기 추가
- payload field 문자열을 여러 파일에 중복 작성

## Qdrant collection 변경

다음이 바뀌면 새 collection을 고려한다.

```text
EMBEDDING_MODEL
EMBEDDING_DIMENSION
QDRANT_DISTANCE
source payload schemaVersion
vector name
```

절차:

```text
1. 새 collection 이름을 정한다.
2. 설정으로 새 collection을 준비한다.
3. source registry 기준 payload index를 생성한다.
4. 데이터를 재색인한다.
5. sample query를 검증한다.
6. qdrant_alias_switch.py로 alias를 전환한다.
7. rollback 가능성을 확인한 뒤 구 collection을 정리한다.
```

서비스 코드에서 실제 collection name을 직접 참조하지 않는다.

## 재색인 스크립트 작성/수정

재색인 스크립트는 source별 ingestion service를 호출해야 한다.

현재 post 기준 경로:

```python
from src.services.rag.posts.ingestion import index_post
```

상위 호환을 위해 `src.services.rag.ingestion` 같은 잡동사니 모듈을 새로 만드는 방식은 피한다. source별 경로가 길더라도 구조가 명확한 편이 유지보수에 낫다.

## 새 외부 client 추가

외부 SDK/HTTP 호출은 `src/clients` 또는 chat provider 전용 `src/services/chat/providers`에 adapter를 둔다.

규칙:

- SDK exception을 내부 exception으로 감싼다.
- secret/env는 `settings`에서 읽는다.
- service 계층은 SDK 객체 대신 project protocol에 의존하게 만든다.
- 테스트에서는 fake client를 주입한다.
- model card의 public id와 provider route를 혼동하지 않는다.

## 새 설정 추가

`src/core/config.py`에 설정을 추가할 때 확인할 것:

- `.env.example`도 갱신했는가?
- 운영 secret인지 일반 config인지 구분했는가?
- 기본값이 안전한가?
- docs에 반영했는가?
- 테스트에서 설정 오염을 되돌리는 fixture가 필요한가?

## 코드 리뷰 체크리스트

### 공통

- 계층 경계가 맞는가?
- endpoint에 orchestration이 과하게 들어가지 않았는가?
- schema alias가 외부 계약과 맞는가?
- 외부 provider error를 안전하게 감쌌는가?
- 테스트가 외부 network에 의존하지 않는가?

### LangGraph/chat/tool

- `thread_id`와 `run_id`가 섞이지 않았는가?
- run `config.configurable.thread_id`가 URL path 기준으로 병합되는가?
- 새 tool이 `ToolSpec`과 registry에 등록되었는가?
- risky tool이 `default_allowed=False`인가?
- HITL decision별 테스트가 있는가?
- public SSE event shape가 SDK 호환 형태로 유지되는가?
- `stream_resumable` replay가 필요한 이벤트를 저장하는가?

### RAG/Qdrant

- repository가 source-agnostic인가?
- source definition이 point id/payload/filter/index를 소유하는가?
- payload index가 registry를 통해 setup되는가?
- model/dimension 변경 시 collection 교체가 고려되었는가?
- Java DB source of truth를 우회하지 않는가?

## 작업 후 검증

```bash
uv run pytest
uv run pyrefly check
```

문서만 바꿨더라도 링크, 파일명, 경로가 실제 구조와 맞는지 확인한다.
