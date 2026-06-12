# Agent-Service Scratch Pad

이 문서는 `backend/services/agent-service`를 볼 때 내가 다시 웹에서 확인한 기술 포인트를 모아둔 메모다.
최근 LangGraph Agent Server streaming 계약이 바뀐 부분이 있어서, 아래 항목들은 로컬 코드 기억보다 공식 문서 재확인이 더 안전했다.

## 핵심 결론

- 현재 확인 기준은 Protocol V2 event streaming이다.
- 공식 Event Streaming API는 `langgraph-api>=0.10.0`이 필요하다.
- 로컬 lock의 `langgraph-api==0.9.0`은 feature flag 기반 preview라 최종 계약 기준으로 삼으면 안 된다.
- 프론트 `useStream` 쪽 핵심 경로는 legacy `runs/stream`보다 `POST /threads/{thread_id}/stream/events` + `POST /threads/{thread_id}/commands` 쪽이다.
- `threadId`를 프론트에서 유지해야 reconnect/join 흐름이 자연스럽다.
- 메시지 본문은 `BaseMessage.text`, 표준 블록은 `BaseMessage.contentBlocks`를 사용한다.
- reasoning은 `contentBlocks`에서 `type === "reasoning"`인 블록만 렌더링한다.
- 프론트가 `additional_kwargs.reasoning_content`를 직접 파싱하면 안 된다.

## 공식 문서 링크

- Agent Server changelog
  - https://docs.langchain.com/langsmith/agent-server-changelog
- Event Streaming API
  - https://docs.langchain.com/langsmith/event-streaming
- LangChain JS messages / standard content blocks
  - https://docs.langchain.com/oss/javascript/langchain/messages
- LangChain JS reasoning streaming
  - https://docs.langchain.com/oss/javascript/langchain/streaming
- LangGraph event streaming
  - https://docs.langchain.com/oss/javascript/langgraph/event-streaming
- DeepSeek thinking mode
  - https://api-docs.deepseek.com/guides/thinking_mode
- 공식 LangChain DeepSeek integration
  - https://docs.langchain.com/oss/python/integrations/providers/deepseek
  - https://pypi.org/project/langchain-deepseek/
- Frontend `useStream` join/rejoin
  - https://docs.langchain.com/oss/javascript/langchain/frontend/join-rejoin
- Frontend HITL with `useStream`
  - https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop
- Thread run stream API reference
  - https://docs.langchain.com/langsmith/agent-server-api/thread-runs/create-run-stream-output

## 내가 다시 확인한 포인트

### 1. V2 event streaming 지원 버전

`langgraph-api 0.9.0`에서는 `FF_V2_EVENT_STREAMING=true`로 preview endpoint를 열었다.
2026-06-10에 배포된 `langgraph-api 0.10.0`이 stable promotion이며, 현재 공식 문서는
Event Streaming API의 최소 버전을 `langgraph-api>=0.10.0`으로 명시한다.

클라이언트 최소 버전:

```text
Python: langgraph-sdk>=0.4.0, langchain-core>=1.4.0
JS:     @langchain/langgraph-sdk>=1.9.15
```

현재 확인한 레포 버전:

```text
server lock: langgraph-api 0.9.0
server test: langgraph-api 0.10.0
frontend:    @langchain/langgraph-sdk 1.9.20
frontend:    @langchain/react 1.0.20
```

### 2. SSE는 POST `/stream/events`

Protocol v2 SSE 문서 기준으로 event stream은 connection-scoped stream이다.
요청 body에 `channels`, `namespaces`, `depth`, `since`를 실어 보낸다.

```bash
curl --request POST \
  --url http://localhost:2024/threads/$THREAD_ID/stream/events \
  --header 'Content-Type: application/json' \
  --data '{
    "channels": ["values", "messages", "tools", "input", "lifecycle", "updates"],
    "namespaces": [[]],
    "depth": 20,
    "since": 0
  }'
```

내 로컬 eval client와 맞춰볼 포인트:

```python
PROTOCOL_V2_CHANNELS = [
    "values",
    "messages",
    "tools",
    "input",
    "lifecycle",
    "updates",
]
```

문서상 구독 가능한 채널 후보 메모:

```text
values
updates
messages
tools
lifecycle
input
tasks
custom
```

### 3. 실행은 `/commands`로 시작

Protocol v2 command 문서 기준으로 `run.start`, `input.respond`는 background run을 만들고,
실제 event 관찰은 동시에 열린 `/stream/events`에서 한다.

`run.start` 예시:

```bash
curl --request POST \
  --url http://localhost:2024/threads/$THREAD_ID/commands \
  --header 'Content-Type: application/json' \
  --data '{
    "id": 1,
    "method": "run.start",
    "params": {
      "assistant_id": "chat",
      "input": {
        "messages": [
          { "type": "human", "content": "add 도구를 사용해서 2 + 3을 계산해줘." }
        ]
      }
    }
  }'
```

`input.respond` 예시:

```bash
curl --request POST \
  --url http://localhost:2024/threads/$THREAD_ID/commands \
  --header 'Content-Type: application/json' \
  --data '{
    "id": 2,
    "method": "input.respond",
    "params": {
      "namespace": [],
      "interrupt_id": "REPLACE_ME",
      "response": {
        "decisions": [
          { "type": "approve" }
        ]
      }
    }
  }'
```

### 4. 프론트는 `threadId` 유지가 중요

`useStream` join/rejoin 문서 기준으로 remount 후에도 같은 `threadId`를 유지하면 현재 thread state와 진행 중 run에 다시 붙는다.

레포에 맞춰 적어보면:

```tsx
import { useStream } from "@langchain/react";
import { useState } from "react";

export function Chat() {
  const [threadId, setThreadId] = useState<string | null>(
    () => sessionStorage.getItem("activeThreadId"),
  );

  const stream = useStream({
    apiUrl: "/api/proxy/agent",
    assistantId: "chat",
    threadId,
    onThreadId(id) {
      setThreadId(id);
      if (id) sessionStorage.setItem("activeThreadId", id);
    },
  });

  return null;
}
```

### 5. HITL 응답 방식

`useStream` HITL 문서에서는 interrupt가 오면 `stream.submit(null, { command: { resume: ... } })` 패턴을 보여준다.
우리 서버가 native Agent Server 흐름에 맞는지 볼 때 이 감각을 유지하면 된다.

```tsx
const interrupt = stream.interrupt;

if (interrupt) {
  await stream.submit(null, {
    command: {
      resume: { decisions: [{ type: "approve" }] },
    },
  });
}
```

주의:

- 이 코드는 프론트 SDK 사용 예시다.
- 현재 레포의 `evals`는 SDK 대신 HTTP/SSE를 직접 때리는 테스트 harness다.

### 6. Reasoning content block 실호출 결과

`langgraph-api 0.10.0` 서버와 프론트가 실제 사용하는 `StreamController`로 확인했다.

Ollama `gpt-oss:120b`:

```ts
message.content = [
  { type: "reasoning", reasoning: "..." },
  { type: "text", text: "2" },
]

message.text === "2"
message.contentBlocks === message.content
```

OpenCode Zen의 현재 `ChatOpenCodeZen(ChatOpenAI)`:

```ts
message.content = [{ type: "text", text: "2" }]
message.text === "2"
```

provider 원본 chunk에는 아래 값이 존재했다.

```python
AIMessageChunk(
    content="",
    additional_kwargs={"reasoning_content": "..."},
    response_metadata={"model_provider": "openai"},
)
```

문제 원인:

- Python `langchain-core 1.4.3`에는 `additional_kwargs.reasoning_content`를
  표준 reasoning block으로 승격하는 fallback이 이미 있다.
- 하지만 `model_provider="openai"`이면 OpenAI translator가 먼저 실행되어 그 fallback이 우회된다.
- 따라서 프론트 파서 문제가 아니라 OpenCode provider 경계의 잘못된 provider tag 문제다.

비교 실험으로 `langchain-deepseek 1.1.0`의 `ChatDeepSeek`에 OpenCode Zen base URL을
넣어 단일 text/reasoning 요청을 호출한 결과:

```python
output.content == [
    {"type": "reasoning", "reasoning": "...", "index": 0},
    {"type": "text", "text": "2", "index": 1},
]
output.response_metadata["model_provider"] == "deepseek"
```

이 결과는 `reasoning_content`가 올바른 provider translator를 거치면 표준 reasoning
block이 된다는 것만 증명한다. OpenCode Zen과 DeepSeek API의 전체 호환성을 증명하지 않는다.

OpenCode 공식 문서는 DeepSeek V4를 OpenCode의 `chat/completions` endpoint와
`@ai-sdk/openai-compatible` 조합으로 문서화한다. 따라서 OpenCode provider를
`ChatDeepSeek`로 통째로 치환하면 안 된다.

현재 안전한 경계:

- OpenCode Zen transport는 `ChatOpenAI` 기반 openai-compatible 경계를 유지한다.
- OpenCode가 추가로 내보내는 `reasoning_content`만 LangChain message 계약에 보존한다.
- 보존된 값을 Python `langchain-core`의 공식 `AIMessageChunk.content_blocks`
  fallback이 표준 reasoning block으로 승격하게 한다.
- 이를 위해 `model_provider="openai"`가 OpenAI translator를 강제하지 않도록
  OpenCode provider metadata를 별도로 지정하는 방법을 검증한다.
- 프론트에서는 provider별 fallback parser를 만들지 않는다.

`ChatDeepSeek` 치환 여부는 tool calling, tool result replay, request parameters,
usage metadata, error semantics, non-DeepSeek Zen 모델까지 별도로 검증하기 전에는 채택하지 않는다.

### 7. React에서 사용할 공식 메시지 표면

자체 `LangGraphMessage`, `getMessageType`, `getMessageText`,
`getThinkingText`는 필요하지 않다.

```tsx
import { AIMessage, ToolMessage } from "@langchain/core/messages";

const text = message.text;
const reasoning = message.contentBlocks
  .filter((block) => block.type === "reasoning")
  .map((block) => block.reasoning)
  .join("");

if (AIMessage.isInstance(message)) {
  // message.tool_calls
}

if (ToolMessage.isInstance(message)) {
  // message.tool_call_id, message.status
}
```

`@langchain/react`의 `useStream`은 이미 아래 projection을 제공한다.

```text
stream.messages
stream.values
stream.toolCalls
stream.interrupts
stream.interrupt
stream.isLoading
stream.threadId
stream.submit()
stream.respond()
```

### 8. Tool call / HITL 실호출 결과

승인 전:

```text
stream.messages[-1].tool_calls -> multiply call 존재
stream.interrupts              -> action_requests/review_configs 존재
stream.toolCalls               -> 아직 비어 있음
```

`stream.toolCalls`는 실제 tool lifecycle이 시작된 뒤 채워진다.
따라서 승인 전 호출 표시는 `AIMessage.tool_calls`, 승인 UI는 `stream.interrupts`,
실행 상태/결과는 `stream.toolCalls`를 그대로 사용하면 된다.
이 경계를 자체 메시지 parser나 별도 message facade로 다시 조립하지 않는다.

## 레포와 연결되는 로컬 포인트

- Agent graph id

```json
{
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  }
}
```

- custom catalog route는 아직 별도 유지

```text
GET /api/v1/llm/models
GET /api/v1/llm/tools
```

- stream 실행 판단 기준

```text
stream/events + commands -> v2 native flow
runs/stream             -> older / adjacent run-stream flow
```

## 정리 메모

- `backend/services/agent-service/src/agent/**` 런타임은 비교적 native Agent Server 쪽으로 정리되어 보였다.
- 남은 legacy 냄새는 주로 `evals`에서 old event name fallback을 허용하는 부분이었다.
- docs 쪽에는 아직 `/runs/stream`나 예전 FastAPI adapter 구조를 설명하는 문서가 섞여 있다.
