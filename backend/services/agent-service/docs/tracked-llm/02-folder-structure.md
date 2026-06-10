# 02. Folder Structure

`llm`은 파일 종류별로 무조건 나누기보다, HTTP 경계, 외부 client, 저장소 adapter, chat orchestration, LangGraph 호환 protocol adapter, RAG source orchestration을 분리한다.

## 루트 구조

```text
llm/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── pyproject.toml
├── uv.lock
├── .env.example
├── scripts/
├── src/
├── tests/
└── evals/
```

`CLAUDE.md`는 `AGENTS.md`를 참조한다. AI 작업자는 먼저 `AGENTS.md`를 읽고, 상세 내용은 `docs`를 확인한다.

## `src` 구조

```text
src/
├── api/
├── clients/
├── core/
├── repositories/
├── schemas/
├── services/
└── main.py
```

### `src/main.py`

FastAPI 앱 생성 지점이다.

책임:

- 앱 title/version 설정
- lifespan에서 Qdrant collection/alias/index 준비
- CORS middleware 등록
- `/api/v1` router 포함

앱 시작 시 Qdrant 초기화를 시도하지만, endpoint별 비즈니스 로직을 `main.py`에 넣지 않는다.

### `src/api`

HTTP router 계층이다.

```text
api/
├── deps.py
├── router.py
└── endpoints/v1/
    ├── health.py
    ├── langgraph.py
    └── rag_posts.py
```

책임:

- `/api/v1` prefix 유지
- 보호 endpoint에 `require_api_key` 적용
- request/response schema 연결
- service exception을 HTTP status로 변환
- `StreamingResponse` 공통 header 설정
- LangGraph Agent Server API와 호환되는 thread/run endpoint를 FastAPI 안에서 직접 노출

넣지 말 것:

- Qdrant payload/filter 조립
- LangGraph node 구현
- tool 실행 로직
- embedding client 직접 호출
- source별 business rule
- provider별 stream chunk 파싱

### `src/schemas`

외부 HTTP 계약이다.

```text
schemas/
├── chat.py
├── health.py
├── langgraph.py
└── rag.py
```

`schemas/langgraph.py`는 `/api/v1/langgraph/**` request/response shape를 정의한다. `thread_id`/`threadId`, `assistant_id`/`assistantId`, `stream_mode`/`streamMode`, `stream_resumable`/`streamResumable`처럼 LangGraph SDK 쪽 camelCase와 Python 쪽 snake_case를 함께 받는다.

`schemas/chat.py`는 더 이상 stream session 생성 요청을 갖지 않는다. 현재는 tool/model metadata와 HITL decision literal처럼 chat 공통 계약만 가진다.

Java 계약이 camelCase인 RAG payload는 `Field(alias=...)`와 `populate_by_name=True`로 처리한다.

### `src/core`

공통 설정과 보안 경계다.

```text
core/
├── config.py
├── exceptions.py
└── security.py
```

책임:

- 환경 변수 로딩
- app-wide setting
- API key 검증
- 공통 exception base

도메인별 설정을 무작정 늘리기보다 실제 사용하는 계층이 무엇인지 먼저 확인한다.

### `src/clients`

외부 SDK/HTTP client 생성 경계다.

```text
clients/
├── gemini.py
├── http.py
└── qdrant.py
```

책임:

- SDK client 생성과 cache
- 외부 오류를 내부 error로 감싸기
- signed URL media fetch
- Qdrant low-level client 생성

넣지 말 것:

- source별 point id 규칙
- Qdrant payload schema
- post search response 조립
- HTTP endpoint status mapping

### `src/repositories`

저장소 adapter 계층이다.

```text
repositories/
├── qdrant.py
└── qdrant_setup.py
```

`qdrant.py`는 source-agnostic vector store 구현이다.

허용되는 성격:

```text
upsert_point
delete_point
set_payload
retrieve_vector
query_points
```

금지되는 성격:

```text
upsert_post
search_posts
delete_document
build_post_filter
```

`qdrant_setup.py`는 collection, vector config, payload index, alias를 준비한다. payload index 목록은 source registry에서 가져와야 한다.

### `src/services/chat`

Chat/LangGraph/tool/HITL 실행 계층이다.

```text
services/chat/
├── graph.py
├── nodes.py
├── model_cards.py
├── model_catalog.py
├── models.py
├── routing.py
├── state.py
├── error_log.py
├── stream_debug_log.py
├── fallback/
├── providers/
├── approvals/
├── langgraph_protocol/
├── toolkits/
└── tools/
```

책임:

- LangGraph graph 구성
- 내부 모델 카드 기반 provider route 생성/호출
- 모델 패밀리 fallback 실행
- tool binding
- tool approval interrupt/resume
- tool metadata 제공
- LangGraph checkpoint `thread_id`로 대화 상태 유지

삭제된 과거 책임:

```text
sessions.py              # one-shot EventSource session store 제거
events.py                # LangChain StreamEvent 직접 SSE 직렬화 제거
event_filters.py         # astream_events 필터링 제거
service.py               # session -> graph stream orchestration 제거
stream_events/           # provider별 public chunk 재정규화 제거
```

### `src/services/chat/langgraph_protocol`

FastAPI에서 직접 구현하는 LangGraph 호환 API adapter다.

```text
services/chat/langgraph_protocol/
├── __init__.py
├── config.py
├── input_builder.py
├── json.py
├── run_registry.py
├── sdk_stream_adapter.py
├── state_serializer.py
├── stream_serializer.py
└── thread_store.py
```

파일별 책임:

| 파일 | 책임 |
| ---- | ---- |
| `config.py` | run config에 `configurable.thread_id`를 병합한다. |
| `input_builder.py` | LangGraph SDK style `input`/`command`/`context`를 내부 graph input 또는 `Command`로 변환한다. |
| `json.py` | LangChain message, `Interrupt`, 기타 객체를 JSON 가능 shape로 변환한다. |
| `run_registry.py` | run lifecycle, background task, SSE subscriber, replay buffer, cancel 상태를 관리한다. |
| `sdk_stream_adapter.py` | `chat_graph.astream(..., version="v2")` StreamPart를 LangGraph SDK가 읽는 SSE event/data로 변환한다. |
| `state_serializer.py` | thread state/history를 checkpoint에서 읽고 JSON shape로 직렬화한다. |
| `stream_serializer.py` | SSE frame 생성과 `Last-Event-ID` 파싱을 담당한다. |
| `thread_store.py` | in-memory thread metadata/status store다. |

현재 thread/run store는 개발용 인메모리 구현이다. 서버 재시작 시 thread metadata와 run replay buffer는 사라진다. LangGraph checkpoint도 `graph.py`의 `InMemorySaver`를 사용한다.

### `src/services/chat/tools`

Concrete tool 구현 위치다.

```text
services/chat/tools/
├── tool_spec.py
├── tool_errors.py
└── calculator_tool/
    ├── README.md
    ├── __init__.py
    └── calculator_tool.py
```

각 tool package는 다음을 제공한다.

```text
@tool 함수
ToolSpec
__init__.py export
```

등록은 `services/chat/toolkits/chat_toolkit.py`에서 명시적으로 한다. filesystem discovery는 사용하지 않는다.

### `src/services/rag`

RAG source orchestration 계층이다.

```text
services/rag/
├── embeddings.py
├── models.py
├── posts/
│   ├── ingestion.py
│   └── retrieval.py
└── sources/
    ├── base.py
    ├── registry.py
    └── post/
        └── source.py
```

원칙:

- source별 point id, payload schema, filter, payload index는 source definition이 가진다.
- ingestion/retrieval은 source-specific service가 가진다.
- repository는 generic vector operation만 가진다.

## `tests` 구조

```text
tests/
├── api/v1/
├── clients/
├── repositories/
└── services/
    ├── chat/
    │   ├── approvals/
    │   └── langgraph_protocol/
    └── rag/
```

현재 중요한 테스트 축:

- `tests/api/v1/test_langgraph.py`: `/api/v1/langgraph/**` endpoint 계약
- `tests/services/chat/langgraph_protocol/*`: SDK 호환 stream 변환, JSON 직렬화
- `tests/services/chat/approvals/*`: HITL policy, decision ordering, node 동작
- `tests/services/chat/test_opencode_zen.py`: provider adapter의 reasoning/tool chunk 보존
- `tests/repositories/test_qdrant.py`: repository source-agnostic 경계

## `evals` 구조

```text
evals/
├── README.md
├── ATTRIBUTION.md
├── config.yaml
├── scenarios/
└── agent_eval/
```

`evals`는 HTTP/SSE end-to-end 검증용 harness다. scenario YAML에서 prompt, tool policy, resume decision, validator를 정의하고 runner가 서버 stream을 수집해 검증한다.

## 경계 요약

| 계층 | 해도 되는 일 | 하지 말 것 |
| ---- | ------------ | ---------- |
| `api` | HTTP 계약, API key, status mapping, StreamingResponse | graph node, provider parsing, Qdrant business rule |
| `schemas` | 외부 request/response shape | 내부 provider route/fallback 세부 노출 |
| `services/chat` | graph, model routing, tool/HITL | FastAPI status mapping |
| `services/chat/langgraph_protocol` | LangGraph API 호환 input/output 변환, run/thread store | tool 실행 구현, provider 호출 |
| `services/rag` | source별 ingestion/retrieval | low-level Qdrant client 생성 |
| `repositories` | generic persistence adapter | source-specific method |
| `clients` | SDK/HTTP wrapping | business rule |
