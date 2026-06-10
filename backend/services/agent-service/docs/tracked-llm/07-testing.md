# 07. Testing

`llm` 테스트는 외부 LLM, Gemini, Qdrant에 직접 의존하지 않는 단위/계약 테스트를 기본으로 한다.

## 실행

```bash
cd llm
uv run pytest
uv run pyrefly check
```

## 테스트 구조

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

## API 테스트

위치:

```text
tests/api/v1/test_langgraph.py
tests/api/v1/test_health.py
tests/api/v1/test_rag_posts.py
```

전략:

- `httpx.ASGITransport`로 네트워크 포트 없이 FastAPI app 호출
- `settings.api_key`를 테스트 값으로 고정
- graph/provider/store는 monkeypatch 또는 fake로 대체
- status code, response shape, header, SSE frame을 검증

LangGraph API에서 검증할 것:

- API key 요구
- thread create/get/search shape
- state/history가 `chat_graph` checkpoint serializer를 호출하는지
- run stream이 `chat_graph.astream(..., version="v2")`를 호출하는지
- `config.configurable.thread_id`가 URL path 기준으로 병합되는지
- `input.messages`가 LangChain message로 변환되는지
- `context.model`, `context.reasoning_effort`, `context.allowed_tools`, `context.interrupt_on`이 graph input에 복사되는지
- `Content-Location`/`Location` header가 run URL을 가리키는지
- `stream_resumable` replay와 `Last-Event-ID` 동작
- cancel에서 `rollback`이 `422`인지
- `/langgraph/tools` metadata
- `/langgraph/models` catalog와 catalog error `502`

RAG API에서 검증할 것:

- API key 요구
- index `204`
- unsupported media `422`
- external dependency failure `503`
- related source not found `404`
- response는 `postId/score` shape 유지

## LangGraph protocol 테스트

위치:

```text
tests/services/chat/langgraph_protocol/
```

주요 대상:

- `dump_jsonable()`이 LangChain constructor/kwargs envelope를 외부로 흘리지 않는지
- Human/AI/Tool message가 SDK가 읽을 수 있는 JSON shape인지
- `Interrupt`가 `id`와 `value`를 보존하는지
- `normalize_stream_part()`가 `messages`, `values`, `tools`, `updates` stream을 안정적으로 변환하는지
- `values` StreamPart의 `interrupts`가 `__interrupt__`로 붙는지
- namespaced StreamPart가 `updates|parent|child` 같은 event 이름을 만드는지
- tool progress event가 SDK의 `on_tool_start`/`on_tool_event`/`on_tool_end`/`on_tool_error` shape로 매핑되는지
- 이미 SDK shape인 tool event는 idempotent한지

## Chat approval 테스트

위치:

```text
tests/services/chat/approvals/
```

주요 대상:

- approval policy 우선순위
- interrupt action request/review config shape
- `action_name`과 `allowed_decisions` 계약
- decision ordering이 전체 tool call 순서가 아니라 승인 대상 `action_requests` 순서를 따르는지
- approval node decision handling

HITL tool이면 다음 decision도 테스트한다.

```text
approve: 실제 tool 실행
edit: 수정된 name/args로 실행하되 원래 tool call id 유지
reject: 실행하지 않고 error ToolMessage 생성
respond: 실행하지 않고 success ToolMessage 생성
missing decision: 안전한 error ToolMessage 생성
```

현재 resume decision은 `tool_call_id`로 매칭하지 않는다. 여러 tool call 중 일부만 approval 대상일 때도 approval 대상 action 순서대로 decision을 소비해야 한다.

## Tool registry 테스트

새 tool을 추가하면 최소한 다음을 확인한다.

```text
registry에 나타나는가?
name이 snake_case인가?
ToolSpec.name == tool.name인가?
args_schema가 존재하는가?
중복 이름을 거부하는가?
GET /langgraph/tools metadata가 맞는가?
default_allowed와 allowed_decisions가 의도와 맞는가?
```

## RAG 테스트

위치:

```text
tests/services/rag/
tests/repositories/test_qdrant.py
```

주요 대상:

- post source point id/payload/filter/index
- source registry validation
- ingestion의 media 정렬과 embedding 호출
- retrieval의 query vector/search filter/response mapping
- repository의 named vector 사용
- repository public surface가 source-agnostic인지

특히 다음 테스트 성격을 유지한다.

```text
QdrantRagRepository에 upsert_post/search_posts 같은 source-specific method가 없어야 한다.
```

이 테스트는 폴더 구조 유지보수성을 지키는 방어선이다.

## Fake object 패턴

외부 서비스 대신 protocol에 맞는 fake를 만든다.

예시 성격:

```python
class FakeGraph:
    async def astream(self, input_payload, *, config, stream_mode, version):
        assert version == "v2"
        yield ("updates", {"step": 1})
```

```python
class FakeVectorStore:
    async def upsert_point(self, *, point_id, vector, payload):
        self.upserts.append((point_id, vector, payload))
```

이 방식의 장점:

- Qdrant 없이 테스트 가능
- Gemini API key 없이 테스트 가능
- provider API key 없이 테스트 가능
- deterministic assertion 가능
- source service와 repository 경계를 분리해서 검증 가능

## Client 테스트

`clients` 테스트는 SDK 자체를 검증하지 않는다. 우리 adapter가 다음을 제대로 하는지 본다.

- 설정 값 사용
- 입력 validation
- 외부 exception wrapping
- 반환 타입 정규화

## Smoke script와 단위 테스트 구분

`scripts/gemini_multimodal_smoke_test.py` 같은 script는 실제 외부 provider를 확인하는 용도다.

단위 테스트에 넣지 말 것:

- 실제 Gemini 호출
- 실제 Ollama/OpenRouter/OpenCode Zen 호출
- 실제 Qdrant network 호출
- 실제 signed URL HTTP fetch

필요하면 별도 수동 smoke 절차로 문서화한다.

## 새 RAG source 테스트 체크리스트

- source type 중복 validation
- `sourceType` payload index 존재
- filter field가 모두 indexed인지
- conflicting field schema를 거부하는지
- deterministic point id 생성
- payload schemaVersion 포함
- query filter가 sourceType을 항상 포함하는지
- result payload fields가 최소인지
- ingestion에서 embedding 입력이 안정적인지
- retrieval에서 repository generic method만 쓰는지

## 새 API 테스트 체크리스트

- API key 필요 여부
- request validation `422`
- 정상 status code
- response model shape
- service exception별 status mapping
- camelCase/snake_case alias
- SSE header와 event frame
- docs와 endpoint path 일치

## pyrefly

```bash
uv run pyrefly check
```

LangGraph/Pyrefly 호환성 때문에 일부 곳에는 명시적 `cast`나 ignore가 있을 수 있다. 타입 오류를 없애기 위해 graph state shape를 느슨하게 망가뜨리지 않는다.
