## /threads/{thread_id}/stream/events

`evals/agent_eval/client.py`와 `frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`가 같은 Protocol V2 스트리밍 계약을 쓴다. 브라우저 쪽은 `http://localhost:8088/api/agent`를 `apiUrl`로 넘기고, eval 쪽은 Agent Server에 직접 붙는다.

```py
async with self._client.stream(
    "POST",
    f"/threads/{thread_id}/stream/events",
    headers=self._headers(accept="text/event-stream"),
    json={
        "channels": PROTOCOL_V2_CHANNELS,
        "namespaces": [[]],
        "depth": 20,
        "since": self._last_seq_by_thread.get(thread_id, 0),
    },
) as response:
    response.raise_for_status()
```

`since`는 thread별 마지막 `seq`다. `StreamRecord.data["seq"]`를 읽어서 다음 스트림의 재개 지점으로 저장한다.

## PROTOCOL_V2_CHANNELS

`evals/agent_eval/client.py`는 아래 채널만 구독한다.

```py
PROTOCOL_V2_CHANNELS = [
    "values",
    "messages",
    "tools",
    "input",
    "lifecycle",
    "updates",
]
```

`tasks`와 custom channel은 여기 들어가지 않는다. 이 harness는 chat graph가 실제로 내보내는 값만 받는다.

## run.start

첫 실행은 `run.start` command다. `assistant_id` 기본값은 `"chat"`이고, `input`은 turn prompt를 감싼 메시지 배열이다.

```py
def _build_run_start_command(self, payload: dict[str, Any]) -> dict[str, Any]:
    params: dict[str, Any] = {
        "assistant_id": payload.get("assistant_id", "chat"),
        "input": payload.get("input"),
    }
    context = payload.get("context")
    if isinstance(context, dict) and context:
        params["config"] = {"configurable": context}

    return {
        "id": 1,
        "method": "run.start",
        "params": params,
    }
```

`runner.py`는 turn마다 새 thread가 필요하면 먼저 `POST /threads`를 친다.

```py
response = await self._client.post(
    "/threads",
    headers=self._headers(accept="application/json"),
    json=payload,
)
```

eval runner가 run에 넣는 context는 `allowed_tools`와 `interrupt_on`뿐이다. model 선택과 reasoning effort는 프로덕션 프론트에서만 함께 보낸다.

## input.respond

HITL 인터럽트가 있으면 `input.requested` frame에서 `interrupt_id`, `namespace`, `payload.action_requests`를 읽고 `input.respond`를 보낸다.

```py
command = {
    "id": 2,
    "method": "input.respond",
    "params": {
        "namespace": namespace,
        "interrupt_id": interrupt_id,
        "response": response_value,
        "config": {"configurable": context},
    },
}
```

`runner.py`는 `turn.resume`가 있을 때만 이 경로를 탄다. `response_value`는 `{"decisions": [...]}` 형태다. `stream_response()`는 재개된 run에도 같은 `config.configurable`을 다시 보낸다.

## SSE frame

`evals/agent_eval/sse.py`의 파서는 `event:`와 `data:`만 읽는다. `id:`는 서버가 `seq`로 채워 주는 값이지만, 여기서는 `StreamRecord.data["seq"]`만 본다.

```py
def parse_sse_frame(raw: str) -> StreamRecord | None:
    event = "message"
    data_lines: list[str] = []
    has_event_field = False
    for line in raw.splitlines():
        if line.startswith("event:"):
            has_event_field = True
            event = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            data_lines.append(line.split(":", 1)[1].lstrip())

    if not has_event_field and not data_lines:
        return None
```

빈 프레임과 comment-only heartbeat는 버린다. `data:`가 JSON object가 아니면 `{"value": ...}`로 감싼다.

## lifecycle

terminal 판별은 `lifecycle` 채널만 본다.

```py
def is_terminal_protocol_event(event: StreamRecord) -> bool:
    if event.event != "lifecycle":
        return False

    params = event.data.get("params", {})
    data = params.get("data", {}) if isinstance(params, dict) else {}
    status = data.get("event") if isinstance(data, dict) else None
    return status in {"completed", "failed", "interrupted"}
```

`stream_run()`은 terminal frame을 만나면 루프를 멈추고, 남은 command task를 기다린 뒤 `parser.flush()`를 한 번 더 돌린다.

## @langchain/react

브라우저 쪽 연결은 `frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`에 있다.

```ts
const AGENT_PROXY_PATH = "http://localhost:8088/api/agent"
const origin =
  process.env.NEXT_PUBLIC_APP_ORIGIN ??
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:9000/application/o/pickle-web/")

const apiUrl = new URL(AGENT_PROXY_PATH, origin).toString()

const stream = useStream<
  LlmChatGraphState,
  HitlRequest,
  Partial<ReturnType<typeof buildSubmitContext>>
>({
  apiUrl,
  assistantId: "chat",
  fetch: langGraphFetch,
  messagesKey: "messages",
  optimistic: true,
  transport: "sse",
  threadId,
  onThreadId: setThreadId,
})
```

`langGraphFetch`는 `credentials: "include"`와 CSRF 헤더를 붙인다. `submit()`은 `run.start`, `respond()`는 `input.respond`로 이어진다.

```ts
await stream.submit(input, {
  config: {
    configurable: context,
  },
  multitaskStrategy: "reject",
})

await stream.respond(
  { decisions },
  {
    config: {
      configurable: context,
    },
  }
)
```

`stream.messages`, `stream.toolCalls`, `stream.interrupts`가 바로 쓰이는 projection이다.

## 주요 파일

- `evals/agent_eval/client.py`
- `evals/agent_eval/sse.py`
- `evals/agent_eval/runner.py`
- `evals/agent_eval/models.py`
- `evals/agent_eval/validators.py`
- `tests/unit_tests/test_eval_protocol_v2.py`
- `langgraph.eval.json`
- `README.md`

## 참고 문서

- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- https://docs.langchain.com/langsmith/agent-server-changelog
- https://docs.langchain.com/langsmith/cli
- https://reference.langchain.com/javascript/langchain-react/use-stream
