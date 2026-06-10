# 03. API Contract

`llm`의 외부 HTTP API는 모두 `/api/v1` 아래에 둔다. 예외적으로 root `/`는 단순 상태 메시지이고, 서비스 계약은 아니다.

## 공통 규칙

- 보호 API는 `X-API-Key` header를 요구한다.
- request/response schema는 `src/schemas`에 둔다.
- endpoint는 service exception을 HTTP status로 매핑한다.
- Java server가 source of truth인 데이터는 Python 응답에서 과하게 재구성하지 않는다.
- Chat 실행 경계는 `/api/v1/langgraph/**` 아래에 둔다. `/api/v1/chat/stream-sessions` one-shot session API는 더 이상 public 계약이 아니다.
- FastAPI가 LangGraph 호환 API를 직접 구현한다. LiteLLM proxy나 별도 LangGraph server process에 위임하지 않는다.

## Endpoint 목록

| Method | Path                                                        | 보호   | 설명                                                    |
| ------ | ----------------------------------------------------------- | ------ | ------------------------------------------------------- |
| GET    | `/api/v1/health`                                            | 아니오 | 서비스 상태 확인                                        |
| POST   | `/api/v1/langgraph/threads`                                 | 예     | LangGraph thread 생성                                   |
| GET    | `/api/v1/langgraph/threads/{thread_id}`                     | 예     | LangGraph thread metadata 조회                          |
| POST   | `/api/v1/langgraph/threads/search`                          | 예     | thread metadata 검색                                    |
| GET    | `/api/v1/langgraph/threads/{thread_id}/state`               | 예     | checkpoint 기준 thread state 조회                       |
| POST   | `/api/v1/langgraph/threads/{thread_id}/history`             | 예     | checkpoint history 조회                                 |
| POST   | `/api/v1/langgraph/threads/{thread_id}/runs/stream`         | 예     | run 생성 및 SSE stream 시작                             |
| GET    | `/api/v1/langgraph/threads/{thread_id}/runs/{run_id}/stream` | 예     | 기존 run stream join/replay                             |
| POST   | `/api/v1/langgraph/threads/{thread_id}/runs/{run_id}/cancel` | 예     | 실행 중인 run interrupt cancel                          |
| GET    | `/api/v1/langgraph/tools`                                   | 예     | 현재 등록된 chat tool metadata 반환                     |
| GET    | `/api/v1/langgraph/models`                                  | 예     | public chat model catalog 반환                          |
| POST   | `/api/v1/rag/posts/index`                                   | 예     | 게시글 embedding 생성 후 Qdrant upsert                  |
| DELETE | `/api/v1/rag/posts/{post_id}/index`                         | 예     | 게시글 vector point 삭제                                |
| PATCH  | `/api/v1/rag/posts/{post_id}/status`                        | 예     | 재임베딩 없이 게시글 status payload 갱신                |
| POST   | `/api/v1/rag/posts/search`                                  | 예     | query embedding 기반 post search                        |
| POST   | `/api/v1/rag/posts/{post_id}/related`                       | 예     | 저장된 post vector 기반 related posts 검색              |

## Health

```http
GET /api/v1/health
```

응답:

```json
{
  "status": "ok",
  "service": "my-harness-server",
  "timestamp": "2026-05-25T00:00:00+00:00"
}
```

`timestamp`는 `HEALTH_SHOW_TIMESTAMP` 설정에 따라 생략될 수 있다.

## LangGraph thread 생성

```http
POST /api/v1/langgraph/threads
X-API-Key: <API_KEY>
Content-Type: application/json
```

요청:

```json
{
  "thread_id": "optional-thread-id",
  "metadata": {"owner": "user-1"},
  "config": {"configurable": {"custom": "value"}}
}
```

`thread_id`는 `threadId` alias도 허용한다. 생략하면 서버가 UUID를 생성한다. 같은 `thread_id`로 다시 생성 요청을 보내면 기존 record의 metadata/config를 갱신하고 기존 thread를 반환한다.

응답:

```json
{
  "thread_id": "thread-1",
  "created_at": "2026-05-28T00:00:00Z",
  "updated_at": "2026-05-28T00:00:00Z",
  "metadata": {"owner": "user-1"},
  "status": "idle",
  "config": {"configurable": {"custom": "value"}},
  "values": null
}
```

status 값은 다음 중 하나다.

```text
idle
busy
interrupted
error
```

## LangGraph thread 조회/search/state/history

Thread metadata 조회:

```http
GET /api/v1/langgraph/threads/{thread_id}
```

Thread 검색:

```http
POST /api/v1/langgraph/threads/search
Content-Type: application/json
```

요청:

```json
{
  "metadata": {"owner": "user-1"},
  "limit": 20,
  "offset": 0
}
```

현재 search는 in-memory thread store의 metadata exact match만 필터링한다. `values` 필드는 request shape 호환을 위해 받지만 검색 조건으로 사용하지 않는다.

Thread state 조회:

```http
GET /api/v1/langgraph/threads/{thread_id}/state
```

Thread history 조회:

```http
POST /api/v1/langgraph/threads/{thread_id}/history
Content-Type: application/json
```

요청:

```json
{
  "limit": 5
}
```

state/history는 `chat_graph.aget_state()`와 `chat_graph.aget_state_history()` 결과를 `dump_jsonable()`로 직렬화한다. LangChain message constructor envelope가 외부로 새지 않도록 `BaseMessage.model_dump(mode="json")` 기반 shape로 변환한다.

알 수 없는 thread는 `404`를 반환한다.

## LangGraph run stream 생성

```http
POST /api/v1/langgraph/threads/{thread_id}/runs/stream
X-API-Key: <API_KEY>
Content-Type: application/json
Accept: text/event-stream
```

요청:

```json
{
  "assistant_id": "chat",
  "input": {
    "messages": [
      {"type": "human", "content": "10 / 2 계산해줘"}
    ]
  },
  "context": {
    "model": "gpt-oss:120b",
    "reasoning_effort": "medium",
    "allowed_tools": ["add", "subtract", "multiply"],
    "interrupt_on": {
      "divide": {"allowed_decisions": ["approve", "reject"]}
    }
  },
  "config": {},
  "stream_mode": ["values", "messages", "tools", "updates"],
  "stream_resumable": true
}
```

Alias 허용:

| snake_case | camelCase |
| ---------- | --------- |
| `assistant_id` | `assistantId` |
| `stream_mode` | `streamMode` |
| `stream_subgraphs` | `streamSubgraphs` |
| `stream_resumable` | `streamResumable` |
| `multitask_strategy` | `multitaskStrategy` |
| `if_not_exists` | `ifNotExists` |
| `on_disconnect` | `onDisconnect` |
| `reasoning_effort` in `context` | `reasoningEffort` |
| `allowed_tools` in `context` | `allowedTools` |
| `interrupt_on` in `context` | `interruptOn` |

입력 변환 규칙:

- `command`가 있으면 `input`보다 우선한다.
- `command.resume`이 있으면 `Command(resume=...)`로 변환한다.
- `input.messages`는 `convert_to_messages()`로 LangChain message 객체가 된다.
- `context.model`, `context.reasoning_effort`, `context.allowed_tools`, `context.interrupt_on`은 graph input payload로 복사된다.
- `stream_mode`가 없으면 `values`, `messages`, `tools`, `updates`를 기본값으로 사용한다.
- `config.configurable.thread_id`는 URL path의 `thread_id`로 덮어쓴다.

응답 header:

```text
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
Content-Location: /api/v1/langgraph/threads/<thread_id>/runs/<run_id>
Location: /api/v1/langgraph/threads/<thread_id>/runs/<run_id>
```

## LangGraph run stream join/replay

```http
GET /api/v1/langgraph/threads/{thread_id}/runs/{run_id}/stream
X-API-Key: <API_KEY>
Accept: text/event-stream
Last-Event-ID: 2
```

`Last-Event-ID`가 있으면 해당 id보다 큰 이벤트만 replay한다. run이 이미 종료된 상태면 replay 가능한 이벤트만 보내고 연결을 닫는다.

`stream_resumable=true`인 run은 stream event를 replay buffer에 저장한다. 또한 초기 subscriber가 아직 없는 상태에서 publish된 event와 `metadata` event는 저장된다.

## LangGraph run cancel

```http
POST /api/v1/langgraph/threads/{thread_id}/runs/{run_id}/cancel?action=interrupt
X-API-Key: <API_KEY>
```

또는 body로 action을 전달할 수 있다.

```json
{
  "action": "interrupt"
}
```

지원 상태:

| action | 결과 |
| ------ | ---- |
| `interrupt` | 실행 task를 cancel하고 run status를 `cancelled`, thread status를 `interrupted`로 둔다. |
| `rollback` | 현재 지원하지 않으며 `422`를 반환한다. |

알 수 없는 run은 `404`다.

## SSE stream event 계약

`run_registry`는 `chat_graph.astream(..., stream_mode=..., version="v2")` 결과를 `sdk_stream_adapter.to_sdk_sse_event()`로 변환한 뒤 SSE frame으로 보낸다.

SSE frame:

```text
id: <integer>
event: <event_name>
data: <json>

```

주요 event name:

```text
metadata
values
messages
tools
updates
error
```

Subgraph namespace가 있으면 event 이름에 pipe suffix가 붙는다.

```text
updates|parent|child
values|subgraph
```

`metadata` event는 run lifecycle 정보를 담는다.

```json
{"run_id":"run-1","thread_id":"thread-1","status":"running"}
```

실행 실패는 `error` event로 보낸다.

```json
{
  "error": "run_failed",
  "message": "LangGraph run failed.",
  "detail": "..."
}
```

이전 public stream의 `done` event는 더 이상 별도 계약이 아니다. 연결 종료와 `metadata.status`가 run 종료 상태를 나타낸다.

## HITL interrupt/resume

승인이 필요한 tool call이 있으면 `approval_gate`가 LangGraph `interrupt()`를 호출한다. Python LangGraph v2 `values` StreamPart의 `interrupts` 필드는 SDK가 읽을 수 있도록 `values` event data의 `__interrupt__`로 붙는다.

Interrupt payload:

```json
{
  "__interrupt__": [
    {
      "id": "interrupt-1",
      "value": {
        "action_requests": [
          {
            "name": "divide",
            "args": {"a": 10, "b": 2},
            "description": "첫 번째 숫자를 두 번째 숫자로 나눕니다."
          }
        ],
        "review_configs": [
          {
            "action_name": "divide",
            "allowed_decisions": ["approve", "reject"]
          }
        ]
      }
    }
  ]
}
```

Resume은 새 사용자 메시지가 아니라 `command.resume` run으로 처리한다.

```http
POST /api/v1/langgraph/threads/{thread_id}/runs/stream
Content-Type: application/json
Accept: text/event-stream
```

```json
{
  "command": {
    "resume": {
      "decisions": [
        {"type": "approve"}
      ]
    }
  },
  "stream_mode": ["values", "messages", "tools", "updates"]
}
```

지원 decision:

| type      | 의미                                                   |
| --------- | ------------------------------------------------------ |
| `approve` | 원래 tool call 실행                                    |
| `edit`    | `editedAction`의 name/args로 수정 실행                 |
| `reject`  | 실행하지 않고 rejection ToolMessage를 model에 전달     |
| `respond` | 실행하지 않고 human response ToolMessage를 model에 전달 |

`edit` 예시:

```json
{
  "type": "edit",
  "editedAction": {
    "name": "multiply",
    "args": {"a": 2, "b": 3}
  }
}
```

Decision은 `tool_call_id`로 매칭하지 않는다. LangGraph human-in-the-loop 표준 계약에 맞춰 `action_requests` 순서와 같은 위치의 decision을 사용한다.

## Tool stream normalization

`tools` stream data는 SDK가 기대하는 event 이름으로 변환된다.

| 내부 event | 외부 tools data.event |
| ---------- | ---------------------- |
| `tool-started` | `on_tool_start` |
| `tool-progress` | `on_tool_event` |
| `tool-event` | `on_tool_event` |
| `tool-finished` | `on_tool_end` |
| `tool-error` | `on_tool_error` |

예시:

```json
{
  "event": "on_tool_start",
  "toolCallId": "call-1",
  "name": "add",
  "input": {"a": 1, "b": 2}
}
```

## Chat tools metadata

```http
GET /api/v1/langgraph/tools
X-API-Key: <API_KEY>
```

응답:

```json
{
  "tools": [
    {
      "name": "divide",
      "description": "첫 번째 숫자를 두 번째 숫자로 나눕니다.",
      "category": "calculator",
      "default_allowed": true,
      "allowed_decisions": ["approve", "edit", "reject", "respond"]
    }
  ]
}
```

client tool policy UI는 이 metadata를 기준으로 표시된다. 새 tool을 추가하면 `ToolSpec` metadata를 정확히 채운다.

## Chat models metadata

```http
GET /api/v1/langgraph/models
X-API-Key: <API_KEY>
```

응답:

```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-oss-20b",
      "object": "model",
      "created": 1677610602,
      "supported_reasoning_efforts": ["none", "low", "medium", "high"]
    }
  ]
}
```

`model_family`, provider route, fallback 순서는 외부 응답에 포함하지 않는다.

## RAG post index

```http
POST /api/v1/rag/posts/index
X-API-Key: <API_KEY>
Content-Type: application/json
```

요청:

```json
{
  "postId": 1,
  "authorId": 2,
  "content": "본문",
  "visibility": "PUBLIC",
  "status": "ACTIVE",
  "createdAt": "2026-05-22T12:30:00+09:00",
  "mediaAttachments": [
    {
      "attachmentId": 10,
      "contentType": "image/png",
      "sortOrder": 0,
      "signedUrl": "https://example.com/a.png"
    }
  ]
}
```

규칙:

- `content` 또는 `mediaAttachments` 중 하나는 있어야 한다.
- media는 `image/*`만 embedding 대상으로 허용한다.
- 첨부는 `(sortOrder, attachmentId)` 기준으로 안정 정렬한다.
- 게시글 하나는 text + image parts를 합친 단일 vector 하나로 저장한다.

응답은 `204 No Content`다.

에러 매핑:

| 원인                     | Status |
| ------------------------ | ------ |
| 지원하지 않는 media type | `422`  |
| Gemini embedding 실패    | `503`  |
| signed URL fetch 실패    | `503`  |
| Qdrant upsert 실패       | `503`  |

## RAG post delete/status

```http
DELETE /api/v1/rag/posts/{post_id}/index
```

Qdrant point를 삭제하고 `204`를 반환한다.

```http
PATCH /api/v1/rag/posts/{post_id}/status
Content-Type: application/json
```

요청:

```json
{
  "status": "HIDDEN"
}
```

status 변경은 의미 vector를 바꾸지 않으므로 재임베딩 없이 payload만 갱신한다.

## RAG post search

```http
POST /api/v1/rag/posts/search
Content-Type: application/json
```

요청:

```json
{
  "query": "강아지",
  "limit": 5,
  "visibility": "PUBLIC",
  "status": "ACTIVE"
}
```

응답:

```json
{
  "results": [{"postId": 123, "score": 0.91}]
}
```

응답은 후보 `postId`와 score만 담는다. 본문, 작성자, visibility 최종 권한 판단은 Java server/DB가 다시 처리한다.

## RAG related posts

```http
POST /api/v1/rag/posts/{post_id}/related
Content-Type: application/json
```

요청:

```json
{
  "limit": 5,
  "visibility": "PUBLIC",
  "status": "ACTIVE"
}
```

저장된 source post vector를 query vector로 사용하고, source post 자신은 filter에서 제외한다.

| 상황               | Status |
| ------------------ | ------ |
| source vector 없음 | `404`  |
| Qdrant 실패        | `503`  |

## 계약 변경 시 체크리스트

- `src/schemas`의 request/response model 수정
- endpoint status mapping 확인
- LangGraph SDK 호환 alias와 stream shape 확인
- client/server gateway 계약 영향 확인
- API 테스트 추가 또는 수정
- docs 갱신
- camelCase/snake_case alias 확인
