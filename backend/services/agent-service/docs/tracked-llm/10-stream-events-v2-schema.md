# 10. LangGraph SDK Stream Schema

이 문서는 `llm`이 `/api/v1/langgraph/**` run stream에서 browser/client로 내보내는 public SSE event shape를 적는다.

현재 stream은 LangChain `astream_events()`의 `on_chat_model_stream` shape가 아니다. `chat_graph.astream(..., stream_mode=..., version="v2")`에서 나온 LangGraph StreamPart를 `services/chat/langgraph_protocol/sdk_stream_adapter.py`가 LangGraph SDK 호환 event/data로 변환한 결과다.

## Event frame

모든 이벤트는 SSE frame이다.

```text
id: <event_id>
event: <event_name>
data: <json>

```

`event_id`는 run 안에서 1부터 증가한다. `GET /runs/{run_id}/stream` 재접속 시 `Last-Event-ID` header를 주면 해당 id 이후 이벤트만 replay한다.

## Public event names

기본 stream mode는 다음이다.

```text
values
messages
tools
updates
```

Run registry가 추가로 내보내는 event:

```text
metadata
error
```

Subgraph namespace가 있는 StreamPart는 event 이름에 pipe suffix가 붙는다.

```text
updates|parent|child
values|subgraph
```

과거 event 이름인 `on_chat_model_start`, `on_chat_model_stream`, `on_tool_start`, `on_chain_stream`, `done`은 더 이상 public run stream의 기본 계약이 아니다. Tool stream 내부 data에는 SDK 호환을 위해 `on_tool_start` 같은 이름이 들어갈 수 있다.

## Metadata event

Run 시작과 종료 상태는 `metadata` event로 전달된다.

```json
{
  "run_id": "run-id",
  "thread_id": "thread-id",
  "status": "running"
}
```

status 값:

```text
pending
running
success
error
interrupted
cancelled
```

정상 종료 예시:

```text
id: 5
event: metadata
data: {"run_id":"run-id","thread_id":"thread-id","status":"success"}

```

별도의 `done` event는 보내지 않는다.

## Messages stream

`messages` event는 LangGraph token stream payload를 그대로 JSON 가능하게 직렬화한다.

```text
id: 2
event: messages
data: [{"content":"안","type":"AIMessageChunk","id":"ai-1"},{"langgraph_node":"chat_model"}]

```

일반적인 data shape는 다음이다.

```json
[
  {
    "content": "token",
    "type": "AIMessageChunk",
    "id": "ai-1"
  },
  {
    "langgraph_node": "chat_model"
  }
]
```

OpenCode Zen이나 DeepSeek 계열이 `additional_kwargs.reasoning_content`를 제공하면 message chunk에 보존된다.

```json
[
  {
    "content": "",
    "type": "AIMessageChunk",
    "id": "ai-1",
    "additional_kwargs": {"reasoning_content": "생각"}
  },
  {"langgraph_node": "chat_model"}
]
```

client는 provider별 raw delta를 직접 파싱하지 않고 `messages` stream의 message chunk를 기준으로 text/reasoning/tool chunk를 해석한다.

## Values stream

`values` event는 graph state snapshot 또는 values stream data를 담는다.

```json
{
  "messages": [
    {"type": "human", "content": "hello", "id": "human-1"}
  ]
}
```

LangChain message는 constructor/kwargs envelope가 아니라 message JSON shape로 직렬화된다.

```json
{
  "type": "ai",
  "content": "hi",
  "id": "ai-1",
  "tool_calls": [
    {
      "name": "search",
      "args": {"query": "x"},
      "id": "call-1",
      "type": "tool_call"
    }
  ]
}
```

## Interrupt payload

Python LangGraph v2 StreamPart의 `interrupts` 필드는 SDK가 읽을 수 있도록 `values` data의 `__interrupt__`로 붙는다.

```json
{
  "messages": [],
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

주의할 점:

- `type: "tool_approval_required"`는 넣지 않는다.
- `tool_call_id`는 public interrupt/review config에 넣지 않는다.
- resume decision은 `action_requests` 순서에 맞춘다.
- edit decision field는 `editedAction`이다.

## Tools stream

`tools` event의 data는 SDK tool event shape다.

Tool start:

```json
{
  "event": "on_tool_start",
  "toolCallId": "call-1",
  "name": "add",
  "input": {"a": 1, "b": 2}
}
```

Tool progress:

```json
{
  "event": "on_tool_event",
  "toolCallId": "call-1",
  "name": "long_task",
  "data": {"step": 1}
}
```

Tool end:

```json
{
  "event": "on_tool_end",
  "toolCallId": "call-1",
  "name": "add",
  "output": 3
}
```

Tool error:

```json
{
  "event": "on_tool_error",
  "toolCallId": "call-1",
  "name": "divide",
  "error": "0으로 나눌 수 없습니다."
}
```

내부 event 매핑:

| 내부 event | 외부 `tools` data.event |
| ---------- | ----------------------- |
| `tool-started` | `on_tool_start` |
| `tool-progress` | `on_tool_event` |
| `tool-event` | `on_tool_event` |
| `tool-finished` | `on_tool_end` |
| `tool-error` | `on_tool_error` |

이미 `on_tool_start`, `on_tool_event`, `on_tool_end`, `on_tool_error` 형태이면 그대로 통과시킨다.

## Updates stream

`updates` event는 graph node update를 담는다.

```json
{
  "chat_model": {
    "messages": [
      {"type": "ai", "content": "..."}
    ]
  }
}
```

Subgraph namespace가 있으면 event 이름에 suffix가 붙는다.

```text
event: updates|parent|child
```

## Error event

Graph run 실행 중 예외가 발생하면 run status를 `error`로 바꾸고 `error` event를 전송한다.

```json
{
  "error": "run_failed",
  "message": "LangGraph run failed.",
  "detail": "provider error detail"
}
```

Tool 자체 실패는 `tools` stream의 `on_tool_error`로 올 수 있으며, run-level `error`와 구분한다.

## JSON serialization

`dump_jsonable()`은 다음 타입을 처리한다.

- LangChain `BaseMessage`: `model_dump(mode="json", exclude_none=True)` 기반으로 직렬화하고 빈 dict/list는 제거한다.
- LangGraph `Interrupt`: `{id?, value}` 형태로 직렬화한다.
- dict/list/tuple: 재귀 직렬화한다.
- primitive: 그대로 둔다.
- 기타 객체: LangChain `dumpd()`를 사용한다.

이 규칙으로 LangChain constructor envelope나 provider별 Python 객체가 public SSE에 노출되지 않게 한다.

## Client parsing guideline

client는 다음 우선순위를 따른다.

1. `metadata.status`로 run lifecycle을 판단한다.
2. assistant token은 `messages` event에서 읽는다.
3. tool UI는 `tools` event의 `data.event`를 기준으로 갱신한다.
4. HITL UI는 `values.__interrupt__[].value.action_requests`와 `review_configs`를 기준으로 그린다.
5. 재접속은 `Last-Event-ID`를 사용한다.

Provider-specific raw field에 직접 의존하지 않는다.
