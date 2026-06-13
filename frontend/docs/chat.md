# LLM Chat

채팅 화면은 `@langchain/react`의 `useStream` hook을 사용하여 스트리밍 통신과 상태를 관리한다.

## `/api/proxy/agent`

클라이언트는 브라우저에서 Agent Server로 직접 요청하지 않고 BFF(`/api/proxy/agent`)를 거친다.
BFF는 브라우저 쿠키를 읽고 백엔드용 JWT로 교체해 넘긴다.

```ts
const AGENT_PROXY_PATH = "/api/proxy/agent"
const origin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? window.location.origin

const apiUrl = new URL(AGENT_PROXY_PATH, origin).toString()
```

이 `apiUrl`은 Protocol V2 통신을 위한 기준 URL로 쓰인다.

## `useStream`

`useStream`은 legacy 방식(`/runs/stream`) 대신 `transport: "sse"`를 사용해 Protocol V2의 `/stream/events` 및 `/commands`와 통신한다.

```ts
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

`CSRF` 토큰 헤더와 `credentials: "include"`를 위해 `langGraphFetch`를 주입한다.
이 hook은 `stream.messages`, `stream.toolCalls`, `stream.interrupts` 프로젝션을 즉시 제공한다.

## `submit`과 `respond`

사용자 입력을 보내거나(submit) Human-in-the-loop(HITL) 인터럽트를 재개할 때(respond) 동일한 실행 context를 보낸다.
Protocol V2의 `run.start` / `input.respond` 커맨드에서 이 값을 `config.configurable`로 전달하면, 서버 graph는 `Runtime.context`에서 이를 읽어 실행에 반영한다.

```ts
const context = buildSubmitContext(modelSelection, toolPolicy)
// { model, reasoning_effort, allowed_tools, interrupt_on }

// 메시지 전송
await stream.submit(input, {
  config: {
    configurable: context,
  },
  multitaskStrategy: "reject",
})

// 인터럽트 재개
await stream.respond(
  { decisions },
  {
    config: {
      configurable: context,
    },
  }
)
```

## Catalog Fetch

채팅 화면에서 선택 가능한 모델과 툴의 목록은 TanStack Query `useSuspenseQuery`로 가져온다.
이 요청 역시 `/api/proxy/agent` 아래로 프록시된다.

```ts
// GET /api/proxy/agent/api/v1/llm/models
export function useListAgentModelsSuspense() { ... }

// GET /api/proxy/agent/api/v1/llm/tools
export function useListAgentToolsSuspense() { ... }
```

## 주요 파일

- `src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`
- `src/features/llm-chat/hooks/langgraph-chat-stream-context.ts`
- `src/features/llm-chat/lib/langgraph/build-submit-config.ts`
- `src/features/llm-chat/lib/langgraph/build-submit-input.ts`
- `src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`
- `src/features/llm-chat/page/components/chat-shell.tsx`
- `src/features/llm-chat/page/chat-page.tsx`
- `src/app/chat/page.tsx`

## 참고 문서

- `@langchain/react useStream`: https://reference.langchain.com/javascript/langchain-react/use-stream
- Agent Server Protocol V2 Command: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- Agent Server Protocol V2 SSE: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- LangGraph Interrupts: https://docs.langchain.com/oss/python/langgraph/interrupts
