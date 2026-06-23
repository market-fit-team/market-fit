# design4 frontend integration

`frontend/src/app/agent/design4/page.tsx`는 현재 mock state를 직접 가진다.

```ts
const [threads, setThreads] = React.useState<Thread[]>(initialThreads)
const [messages, setMessages] =
  React.useState<Record<string, ChatMessage[]>>(initialMessages)
const [activeThreadId, setActiveThreadId] = React.useState<string>("thread-1")
```

실제 구현은 이 mock state를 제거하고 두 입력만 남긴다.

```text
@langchain/react
-> messages
-> toolCalls
-> interrupts
-> threadId
-> isLoading

Orval
-> thread list
-> thread settings
-> memories
-> artifacts
-> documents
-> feedback
-> onboarding context
```

## no adapter

프론트에 `apiToUiMessage`, `normalizeInterrupt`, `mapToolCallToCard` 같은 중간 adapter 레이어를 만들지 않는다.  
컴포넌트는 LangGraph SDK 타입과 Orval generated 타입을 직접 받는다.

```text
features/llm-chat
-> @langchain/react stream state

shared/api/generated/agent
-> Orval generated REST hooks

app/agent/design4
-> layout
-> panel composition
-> user interaction
```

## ThreadList

`ThreadList`는 Orval thread API를 읽는다.

```text
useListAgentThreadsApiV1AgentThreadsGet()
-> ThreadList
```

선택된 row의 `langgraph_thread_id`가 `LangGraphChatStreamProvider`로 들어간다.

```text
agent_threads.id
-> app UI selected id

agent_threads.langgraph_thread_id
-> useStream threadId
```

## ChatView

`ChatView`는 `messages`, `toolCalls`, `interrupts`를 직접 렌더링한다.

```text
stream.messages
-> MessageBubble / SdkMessageItem 기반 렌더링

stream.toolCalls
-> Thinking/도구 호출 패널

stream.interrupts
-> PermissionGate/HITL card
```

mock의 `generateBotResponse()`와 `setTimeout()`은 제거한다.

```text
onSendMessage(content)
-> stream.submit(input, { config: { configurable: context } })
```

## DynamicPanel

우측 패널은 stream에서 나온 tool result를 연다.

```text
ToolMessage artifact payload
-> artifact panel

ToolMessage search results
-> search_result panel

toolCalls lifecycle
-> thinking/tool panel

Orval documents
-> document panel
```

저장된 artifact 목록은 Orval로 읽는다.  
방금 생성된 artifact는 stream으로 먼저 보이고, 저장 뒤에는 `agent_artifacts`에 들어간다.

## MemoryPanel

MemoryPanel은 Orval CRUD를 직접 쓴다.

```text
GET    /api/v1/agent/memories
POST   /api/v1/agent/memories
PATCH  /api/v1/agent/memories/{memory_id}
DELETE /api/v1/agent/memories/{memory_id}
```

agent가 메모리를 참조하는 흐름은 `memory_search` tool이다.

## onboarding context

thread 선택 뒤 현재 result_code를 읽는다.

```text
GET /api/v1/agent/threads/{thread_id}/onboarding-context
-> result_code
-> onboarding-service GET /surveys/results/{result_code}
```

채팅 중 성향이 갱신되면 stream에서 diff artifact가 보이고, commit 뒤 Orval context query를 invalidate한다.

```text
onboarding_commit_profile_update
-> result_code
-> agent_thread_onboarding_contexts update
-> invalidate onboarding context query
```

## Orval output

agent-service OpenAPI는 `src/agent/webapp.py`의 custom routes에서 나온다.  
프론트 generated client는 기존 경로와 같은 방식으로 둔다.

```text
frontend/src/shared/api/generated/agent/
```

## 닫히는 단위

```text
frontend/src/app/agent/design4/page.tsx
frontend/src/app/agent/design4/_components/chat-view.tsx
frontend/src/app/agent/design4/_components/thread-list.tsx
frontend/src/app/agent/design4/_components/memory-panel.tsx
frontend/src/app/agent/design4/_components/dynamic-panel.tsx
frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx
frontend/src/shared/api/generated/agent/**
```

```text
npm run typecheck
```

## 주요 파일

- `frontend/src/app/agent/design4/page.tsx`
- `frontend/src/app/agent/design4/_components/chat-view.tsx`
- `frontend/src/app/agent/design4/_components/dynamic-panel.tsx`
- `frontend/src/app/agent/design4/_components/memory-panel.tsx`
- `frontend/src/app/agent/design4/_components/thread-list.tsx`
- `frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`
- `frontend/src/shared/api/generated/agent/endpoints/llm/llm.ts`

## 참고 문서

- LangChain frontend SDK overview: `https://docs.langchain.com/oss/python/langchain/frontend/overview`
- Orval docs: `https://orval.dev/docs`
