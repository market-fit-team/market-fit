# 04. LangGraph Chat Stream, Agent Tools, HITL

이 문서는 `llm`의 LangGraph 호환 chat stream, thread/run lifecycle, agent tool registry, HITL approval 흐름을 설명한다.

## 핵심 개념

| 개념 | 의미 |
| ---- | ---- |
| `thread_id` | LangGraph checkpoint에 쓰는 대화 상태 key |
| `run_id` | 특정 graph 실행과 SSE replay 범위를 식별하는 id |
| `stream_mode` | `chat_graph.astream()`에서 받을 stream 종류. 기본값은 `values`, `messages`, `tools`, `updates` |
| `stream_resumable` | run event를 replay buffer에 저장할지 여부 |
| `allowed_tools` | 현재 run에서 승인 없이 실행 가능한 tool allowlist |
| `interrupt_on` | tool별 HITL interrupt override |
| `ToolSpec` | agent tool의 실행 함수, metadata, 승인 정책 단일 출처 |
| `Command(resume=...)` | LangGraph interrupt 이후 HITL decision으로 graph를 재개하는 payload |

과거 `/chat/stream-sessions` 경계의 `session_id`는 제거되었다. 현재 외부 경계는 LangGraph SDK가 기대하는 thread/run 중심 API다.

## LangGraph stream 흐름

```text
POST /api/v1/langgraph/threads
  -> thread_store.create(...)
  -> LangGraphThread 반환

POST /api/v1/langgraph/threads/{thread_id}/runs/stream
  -> build_run_input(input, command, context)
  -> run_registry.start(...)
  -> background task에서 chat_graph.astream(..., version="v2") 실행
  -> sdk_stream_adapter.to_sdk_sse_event(part)
  -> run_registry.subscribe(run_id)
  -> SSE frame 전송

GET /api/v1/langgraph/threads/{thread_id}/runs/{run_id}/stream
  -> Last-Event-ID 이후 event replay
  -> 실행 중이면 subscriber로 join
```

`thread_id`는 LangGraph의 `RunnableConfig`에 들어간다.

```python
config = {"configurable": {"thread_id": thread_id}}
```

`run_id`는 thread state key가 아니다. 한 thread에서 여러 run을 만들 수 있으며, replay와 cancel은 run 단위로 동작한다.

## Graph 구조

현재 graph는 low-level LangGraph node를 직접 구성한다.

```text
START
  -> chat_model
  -> route_after_chat_model
      -> approval_gate
      -> tools
      -> chat_model
  -> END
```

파일 기준:

```text
services/chat/graph.py
services/chat/nodes.py
services/chat/routing.py
services/chat/state.py
services/chat/approvals/nodes.py
```

`create_agent` helper에 의존하지 않고 직접 graph를 구성하는 이유는 다음 경계를 명확히 제어하기 위해서다.

- tool approval interrupt payload
- resume decision ordering
- tool execution ordering
- model/provider fallback과 tool binding
- LangGraph SDK 호환 stream 변환

## LangGraph protocol adapter

외부 `/api/v1/langgraph/**` 계약은 `services/chat/langgraph_protocol`에 모은다.

```text
langgraph_protocol/
├── input_builder.py
├── run_registry.py
├── sdk_stream_adapter.py
├── state_serializer.py
├── stream_serializer.py
└── thread_store.py
```

중요 경계:

- `input_builder.py`는 SDK style request를 내부 graph input으로 바꾼다.
- `run_registry.py`는 background graph task와 SSE subscriber/replay buffer를 관리한다.
- `sdk_stream_adapter.py`는 LangGraph v2 StreamPart를 SDK transport가 읽는 event/data로 변환한다.
- `state_serializer.py`는 checkpoint state/history를 JSON 가능 형태로 노출한다.
- `thread_store.py`는 thread metadata/status를 in-memory로 관리한다.

LiteLLM 같은 외부 proxy의 stream shape에 맞추지 않는다. FastAPI가 내부 graph 실행 결과를 받아 LangGraph SDK 호환 형태로 한 번 더 파싱/직렬화한다.

## Run input 변환

새 사용자 메시지 run은 `input.messages`와 `context`를 사용한다.

```json
{
  "input": {
    "messages": [{"type":"human","content":"안녕"}]
  },
  "context": {
    "model": "gpt-oss:120b",
    "reasoning_effort": "medium",
    "allowed_tools": ["add", "subtract"],
    "interrupt_on": {
      "divide": {"allowed_decisions": ["approve", "reject"]}
    }
  }
}
```

변환 규칙:

```text
input.messages       -> convert_to_messages(...)
context.model        -> ChatState.model
context.reasoning_*  -> ChatState.reasoning_effort
context.allowed_*    -> ChatState.allowed_tools
context.interrupt_*  -> ChatState.interrupt_on
```

HITL resume run은 `command.resume`을 사용한다.

```json
{
  "command": {
    "resume": {
      "decisions": [{"type":"approve"}]
    }
  }
}
```

`command`가 있으면 `input`보다 우선하며 `Command(**command)` 또는 `Command(resume=...)`로 변환한다.

## State

`ChatState`는 다음 값을 가진다.

```text
messages
model
reasoning_effort
allowed_tools
interrupt_on
tool_approval_decisions
```

`messages`는 LangGraph `add_messages` reducer를 사용한다. AIMessage tool call, ToolMessage, human approval 결과가 같은 conversation state 안에서 누적된다.

## Tool registry 구조

현재 tool registry는 명시 등록 방식이다.

```text
services/chat/tools/<tool_domain>_tool/
  -> @tool 함수
  -> ToolSpec tuple

services/chat/toolkits/chat_toolkit.py
  -> CHAT_TOOL_SPECS
  -> CHAT_TOOLS
  -> CHAT_TOOLS_BY_NAME
  -> CHAT_TOOL_SPECS_BY_NAME
  -> list_chat_tools()
```

도구는 filesystem discovery로 자동 등록하지 않는다. 새 tool package를 만들었으면 반드시 `chat_toolkit.py`에 명시 등록한다.

## ToolSpec 계약

`ToolSpec`은 다음을 검증한다.

```text
name은 snake_case
ToolSpec.name == tool.name
description은 blank 불가
args_schema는 Pydantic model class 또는 JSON schema dict
category는 허용된 category literal
default_allowed는 명시
allowed_decisions는 1개 이상
중복 tool name 금지
```

현재 category:

```text
calculator
rag
document
web
file
system
```

새 category가 필요하면 `ToolCategory`와 client UI 영향까지 같이 본다.

## Tool 추가 절차

예시로 `search_posts` tool을 추가한다면 다음 순서를 따른다.

```text
1. services/chat/tools/rag_tool/ 패키지 생성
2. @tool 함수 구현
3. args_schema가 명확한지 확인
4. ToolSpec 정의
5. default_allowed / allowed_decisions 결정
6. services/chat/toolkits/chat_toolkit.py에 등록
7. tests/services/chat/test_tools_registry.py 보강
8. approval policy / execution 테스트 추가
9. GET /api/v1/langgraph/tools 응답 확인
```

구조 예시:

```text
services/chat/tools/rag_tool/
├── README.md
├── __init__.py
└── rag_tool.py
```

`__init__.py`는 외부 등록 지점에서 import할 symbol만 명시한다.

## default_allowed 기준

`default_allowed=True`는 model이 사람 승인 없이 바로 실행할 수 있다는 뜻이다.

기본 허용해도 되는 성격:

- 순수 계산
- 외부 부작용 없음
- 비용/권한/보안 영향 없음
- 입력을 수정해도 시스템 상태가 바뀌지 않음

기본 승인 요구가 맞는 성격:

- 파일 읽기/쓰기
- 외부 HTTP 호출
- RAG write/delete/update
- 문서 생성/수정
- system operation
- 비용이 큰 작업
- 사용자 private data 접근
- 권한 검증이 필요한 작업

위험한 tool은 `default_allowed=False`로 두고, client가 run `context.allowed_tools`나 `context.interrupt_on`으로 정책을 넘기게 한다.

## HITL 승인 정책 우선순위

`requires_approval()`의 우선순위는 다음이다.

```text
1. interrupt_on[tool_name]이 있으면 그것이 우선한다.
   - false: interrupt하지 않음
   - true: interrupt함
   - object: interrupt하고 allowed_decisions를 제한할 수 있음

2. allowed_tools가 있으면 allowlist로 해석한다.

3. allowed_tools가 없으면 ToolSpec.default_allowed를 사용한다.
```

즉 다음 run은 `divide`가 기본 허용 tool이더라도 사람 승인을 요구한다.

```json
{
  "input": {
    "messages": [{"type":"human","content":"10 / 2 계산해줘"}]
  },
  "context": {
    "model": "gpt-oss:120b",
    "reasoning_effort": "medium",
    "allowed_tools": ["add", "subtract", "multiply"],
    "interrupt_on": {
      "divide": {"allowed_decisions": ["approve", "reject"]}
    }
  }
}
```

## Interrupt payload

승인이 필요한 tool call이 있으면 `approval_gate`가 LangGraph `interrupt()`를 호출한다.

payload shape:

```json
{
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
```

`type: "tool_approval_required"`와 `tool_call_id`는 public HITL payload에서 제거되었다. 현재 shape는 LangChain human-in-the-loop middleware 표준에 맞춰 action 이름과 action 순서를 기준으로 한다.

Python LangGraph v2 stream에서 interrupt는 `values` StreamPart의 `interrupts` 필드로 나온다. `sdk_stream_adapter`는 이를 `values` event data의 `__interrupt__`에 붙여 `useStream` 쪽이 `stream.interrupt`/`stream.interrupts`로 읽을 수 있게 한다.

```json
{
  "messages": [],
  "__interrupt__": [
    {
      "id": "interrupt-1",
      "value": {
        "action_requests": [{"name":"divide","args":{"a":10,"b":2}}],
        "review_configs": [{"action_name":"divide","allowed_decisions":["approve","reject"]}]
      }
    }
  ]
}
```

## Resume decision 처리

Resume 요청은 다음 흐름으로 처리된다.

```text
POST /api/v1/langgraph/threads/{thread_id}/runs/stream
  body.command.resume.decisions
  -> build_run_input(...)
  -> Command(resume=resume)
  -> approval_gate update
  -> call_tools_with_approval
```

`call_tools_with_approval`은 승인 대상 action 순서대로 decision을 적용한다. 승인 대상이 아닌 tool call은 decision index를 소비하지 않는다.

decision별 동작:

| decision | 동작 |
| -------- | ---- |
| `approve` | 원래 tool call 실행 |
| `edit` | 원래 tool call id는 유지하고 `editedAction.name/args`만 수정 실행 |
| `reject` | 실행하지 않고 error status ToolMessage 생성 |
| `respond` | 실행하지 않고 success status ToolMessage 생성 |
| decision 없음 | 안전하게 missing approval ToolMessage 생성 |

`edit` decision shape:

```json
{
  "type": "edit",
  "editedAction": {
    "name": "multiply",
    "args": {"a": 2, "b": 3}
  }
}
```

## SSE stream serialization

SSE frame은 `stream_serializer.LangGraphSseEvent`가 만든다.

```text
id: 1
event: values
data: {"messages":[]}

```

`run_registry`는 run 시작/종료 시 `metadata` event를 보낸다.

```json
{"run_id":"...","thread_id":"...","status":"running"}
```

Graph 실행 중 에러는 `error` event로 보낸다.

```json
{
  "error": "run_failed",
  "message": "LangGraph run failed.",
  "detail": "..."
}
```

과거 `done` terminal event는 사용하지 않는다. connection close와 마지막 `metadata.status`가 종료 상태다.

## SDK stream adapter

`chat_graph.astream(..., version="v2")`의 StreamPart는 보통 다음 형태다.

```json
{
  "type": "values",
  "ns": [],
  "data": {"messages": []},
  "interrupts": []
}
```

변환 규칙:

- `part.type`을 SSE `event`로 사용한다.
- `part.ns`가 있으면 `event`에 pipe suffix를 붙인다. 예: `updates|parent|child`.
- `part.data`는 `dump_jsonable()`로 JSON 가능하게 만든다.
- `values` stream의 `interrupts`는 `data.__interrupt__`로 붙인다.
- `tools` stream은 SDK tool event shape로 정규화한다.

Tool event 매핑:

| 내부 event | SDK data.event |
| ---------- | -------------- |
| `tool-started` | `on_tool_start` |
| `tool-progress` | `on_tool_event` |
| `tool-event` | `on_tool_event` |
| `tool-finished` | `on_tool_end` |
| `tool-error` | `on_tool_error` |

이미 SDK 형식인 tool event는 다시 변환하지 않는다.

## Tool error 처리

Tool 자체에서 예측 가능한 입력/권한 문제는 `ChatToolError` 계열로 표현한다.

```text
ChatToolError
InvalidToolInputError
ToolPermissionError
```

LangGraph/ToolNode가 발생시키는 tool error는 `tools` stream의 `on_tool_error` payload로 전달될 수 있다. 이것은 run-level `error` event와 다르다.

## 새 tool 리뷰 체크리스트

- tool name이 snake_case인가?
- tool docstring과 `ToolSpec.description`이 충분한가?
- args_schema가 client의 edit decision UI에서 이해 가능한가?
- 부작용/권한/비용이 있으면 `default_allowed=False`인가?
- `allowed_decisions`가 tool 위험도에 맞는가?
- `chat_toolkit.py`에 등록했는가?
- `GET /api/v1/langgraph/tools` metadata에 나타나는가?
- approval required / approve / edit / reject / respond 테스트가 있는가?
- tool 실행 실패가 안전한 error로 전파되는가?
- client tool policy UI와 이름/category가 맞는가?

## 절대 하지 말 것

- tool package를 만들고 registry 등록을 빼먹지 않는다.
- tool discovery를 위해 directory scan을 추가하지 않는다.
- 위험한 tool을 계산 tool처럼 기본 허용하지 않는다.
- HITL resume을 새 `HumanMessage`로 처리하지 않는다.
- HITL decision을 `tool_call_id` 기준으로 매칭하지 않는다.
- `edit` decision에서 새 tool call id를 만들지 않는다.
- SDK 호환 SSE event shape를 client와 상의 없이 바꾸지 않는다.
