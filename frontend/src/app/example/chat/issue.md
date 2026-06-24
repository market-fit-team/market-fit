# thread-hydrate-hitl-refresh

`src/app/example/chat/[threadId]/page.tsx`는 앱 스레드 UUID를 받아  
`src/features/llm-chat/components/workspace/chat-workspace-thread-view.tsx`로 넘긴다.

`ChatWorkspaceThreadView`는 같은 스레드에 대해 두 개의 복원 경로를 동시에 사용한다.

```text
app thread id
-> useChatWorkspaceThread()
-> langgraph_thread_id resolve

langgraph_thread_id
-> GET /threads/{langgraph_thread_id}/state
-> parseThreadStateMessages()
-> useStream.initialValues.messages

langgraph_thread_id
-> useStream({ threadId })
-> @langchain/react 내부 hydrate
-> threads.getState()
-> tasks[].interrupts seed
```

현재 구현 경로:

- `src/features/llm-chat/components/workspace/chat-workspace-thread-view.tsx`
- `src/features/llm-chat/lib/workspace/parse-thread-state-messages.ts`
- `src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`

## ChatWorkspaceThreadView

`ChatWorkspaceThreadView`는 `langgraph_thread_id`를 얻은 뒤  
`threads/{langgraph_thread_id}/state`를 직접 조회해서 `initialValues.messages`만 만든다.

```tsx
const latestStateQuery = useGetLatestThreadStateThreadsThreadIdStateGet(
  thread?.langgraphThreadId ?? "",
  undefined,
  {
    query: {
      enabled: Boolean(thread?.langgraphThreadId),
    },
  }
)

const initialValues = useMemo<LlmChatGraphState | undefined>(() => {
  if (!latestStateQuery.data) {
    return undefined
  }

  return {
    messages: parseThreadStateMessages(latestStateQuery.data),
  }
}, [latestStateQuery.data])

return (
  <LangGraphChatStreamProvider
    key={thread.langgraphThreadId}
    initialValues={initialValues}
    workspaceThread={{
      appThreadId: thread.id,
      langgraphThreadId: thread.langgraphThreadId,
    }}
  />
)
```

이 시점의 `initialValues`에는 `messages`만 들어간다.  
`tasks`, `interrupts`, `next`, checkpoint 정보는 프런트에서 직접 쓰지 않는다.

## @langchain/react useStream

`LangGraphChatStreamProvider`는 같은 `langgraph_thread_id`를 `useStream({ threadId })`에 다시 넣는다.

```tsx
const stream = useStream<
  LlmChatGraphState,
  HitlRequest,
  Partial<ReturnType<typeof buildSubmitContext>>
>({
  apiUrl,
  assistantId: "chat",
  fetch: langGraphFetch,
  messagesKey: "messages",
  initialValues,
  optimistic: true,
  transport: "sse",
  threadId: activeThreadId,
  onThreadId: workspaceThread ? undefined : setThreadId,
})
```

설치된 `@langchain/react 1.0.24`의 로컬 구현은 `threadId`가 있으면 내부에서 바로 `hydrate(threadId)`를 시작한다.

```js
if (this.#currentThreadId != null) this.hydrate(this.#currentThreadId);
```

같은 패키지 구현에서 `hydrate()`는 `threads.getState(threadId)`를 읽고  
`state.tasks[].interrupts`를 `rootStore.interrupts`로 다시 seed한다.

```js
const state = await this.#fetchHydrationState();

if (Array.isArray(state?.tasks)) {
  const activeInterrupts = [];
  ...
  this.rootStore.setState((s) => ({
    ...s,
    interrupts: activeInterrupts,
    interrupt: activeInterrupts[0]
  }));
}
```

그래서 현재 워크스페이스는 아래처럼 두 소스를 함께 쓴다.

```text
messages
-> latestStateQuery.data.values.messages
-> parseThreadStateMessages()
-> initialValues

interrupts / hydrate error
-> useStream 내부 threads.getState()
-> state.tasks[].interrupts
-> stream.error
```

이 구조에서는 메시지 복원과 인터럽트 복원이 같은 응답을 공유하지 않는다.

## interrupted thread refresh

`divide`를 review로 바꾼 뒤 `10을 2로 나눠줘`를 보내면  
현재 UI는 아래 순서로 멈춘다.

```text
human message
-> AI tool call divide
-> approval_gate interrupt
-> HitlInterruptCard
```

이 상태에서 같은 탭에서 F5를 누르면 아래 조합이 다시 나타난다.

```text
이전 messages 복원됨
+ divide tool call "실행 중" 복원됨
+ HITL interrupt 카드 다시 표시됨
+ "오류: 로그인 세션을 확인하지 못했습니다" 배너 같이 표시됨
```

실제 네트워크에서는 새로고침 직후 아래 요청이 401로 실패했다.

```text
GET http://localhost:8088/api/agent/threads/{langgraph_thread_id}/state
-> 401 Unauthorized
```

같은 스레드에서 interrupt를 처리한 뒤 다시 새로고침하면  
최종 대화는 정상 복원되고 401 배너는 사라졌다.

현재 관찰된 패턴은 아래에 가깝다.

```text
idle thread refresh
-> 대체로 정상 복원

interrupted thread refresh
-> messages는 보이지만
-> state hydrate 401이 먼저 노출될 수 있음
-> interrupt UI는 남아 있음
```

## langGraphFetch / fetchWithAuth

`llm-chat` 스트림은 `langGraphFetch`를 쓴다.

```tsx
const result = (await authClient.getAccessToken({
  providerId: AUTHENTIK_PROVIDER_ID,
})) as AccessTokenResult

const accessToken = extractAccessToken(result)

if (!accessToken) {
  throw new Error("로그인 세션의 access token을 확인하지 못했습니다.")
}

headers.set("authorization", `Bearer ${accessToken}`)
```

반면 generated API는 `fetchWithAuth()`를 쓴다.

```tsx
if (!headers.has("authorization") && typeof window !== "undefined") {
  const accessToken = await getClientOidcAccessToken()

  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`)
  }
}
```

차이는 두 가지다.

```text
fetchWithAuth
-> token이 없으면 헤더 없이 요청 진행

langGraphFetch
-> token이 없으면 바로 Error throw
```

그래서 같은 화면 안에서도 아래처럼 다른 증상이 섞일 수 있다.

```text
일반 query
-> 401 응답

stream / respond
-> access token 조회 단계 예외
-> localNotice 표시
```

`toLocalNotice()`는 401을 모두 같은 문구로 합친다.

```tsx
if (message.includes("HTTP 401")) {
  return "오류: 로그인 세션을 확인하지 못했습니다. 다시 로그인한 뒤 채팅을 이어가 주세요."
}
```

이 문구는 refresh 직후 `state` hydrate 401과  
실제 세션 만료를 구분하지 않는다.

## agent_threads

앱 스레드 목록은 `agent_threads` 테이블의 메타데이터를 그대로 쓴다.

```py
class AgentThreadRecord(TimestampMixin, Base):
    id: Mapped[UUID]
    auth_user_uuid: Mapped[str]
    langgraph_thread_id: Mapped[str]
    title: Mapped[str]
    subtitle: Mapped[str | None]
    last_message_preview: Mapped[str | None]
    message_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_message_at: Mapped[datetime | None]
```

좌측 채팅 목록은 이 값을 그대로 렌더한다.

```tsx
<p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
  {thread.lastMessagePreview ?? "아직 메시지가 없습니다."}
</p>

<span>{thread.messageCount}개 메시지</span>
```

현재 구현에서 `WorkspaceService.create_thread()`는 스레드와 설정만 만든다.

```py
langgraph_thread_id = await self._agent_client.create_thread(...)
record = await thread_repository.create(...)
await thread_settings_repository.create_from_preferences(...)
await session.commit()
```

대화 turn이 끝난 뒤 `message_count`, `last_message_preview`, `last_message_at`를  
갱신하는 경로는 현재 코드에서 보이지 않는다.

로컬 DB 확인 결과도 같은 상태였다.

```text
agent_threads
-> message_count = 0
-> last_message_preview = null
-> last_message_at = null
```

그래서 실제 LangGraph thread state에는 메시지가 있어도  
앱 스레드 목록은 계속 아래처럼 보인다.

```text
새 대화
아직 메시지가 없습니다.
0개 메시지
```

이 문제는 `이전 세션 페이지에서 채팅 내역이 안 보인다`는 체감과 직접 연결된다.

## tool policy / model selection / selected ids

resume는 현재 UI 상태를 다시 `config.configurable`로 만든다.

```tsx
const context = buildSubmitContext(
  modelSelection,
  toolPolicy,
  workspaceThread?.appThreadId,
  latestTurnOptionsRef.current.selectedDocumentIds,
  latestTurnOptionsRef.current.selectedArtifactIds
)

await stream.respond(
  { decisions },
  {
    config: {
      configurable: context,
    },
  }
)
```

그런데 이 값들은 refresh-safe 저장소가 아니다.

```text
tool policy
-> useToolPolicyStore
-> in-memory Zustand only

model selection
-> useChatModelSelectionStore
-> in-memory Zustand only

selected document / artifact ids
-> ChatWorkspaceUiProvider useState
-> route refresh 시 초기화
```

실제 확인한 동작:

```text
divide 를 review로 바꿈
-> 도구 (11/22)

같은 탭에서 F5
-> interrupt 카드 유지
-> 도구 (12/22)로 복귀
```

pending interrupt는 이전 run의 정책으로 만들어졌는데  
resume는 refresh 뒤의 기본 정책과 현재 선택값으로 다시 이어질 수 있다.

계산기 예제에서는 바로 드러나지 않지만  
문서 선택, 아티팩트 선택, 모델 선택이 있는 thread에서는 실행 문맥이 바뀔 수 있다.

## signOut

헤더 로그아웃은 `signOut()` 후 홈으로만 이동한다.

```tsx
await signOut({
  fetchOptions: {
    onSuccess: () => {
      setIsLogoutDialogOpen(false)
      router.push("/")
    },
  },
})
```

전역 `QueryClient`는 앱 생명주기 동안 유지된다.

```tsx
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: queryConfig,
    })
)
```

현재 로그아웃 경로에는 아래 정리가 없다.

```text
queryClient.clear()
llm-chat query remove
tool policy store reset
model selection store reset
workspace UI selection reset
```

그래서 로그아웃 전 `example/chat`에서 읽은 thread state, error, query cache가  
같은 SPA 프로세스 안에 남아 새 로그인 세션과 섞일 수 있다.

## agent_hitl_events

`backend/services/agent-service/src/agent/db/models.py`에는  
HITL 이벤트 테이블이 따로 있다.

```py
class AgentHitlEventRecord(Base):
    __tablename__ = "agent_hitl_events"

    id: Mapped[UUID]
    auth_user_uuid: Mapped[str]
    thread_id: Mapped[UUID]
    langgraph_thread_id: Mapped[str]
    interrupt_id: Mapped[str | None]
    tool_call_id: Mapped[str | None]
    action_requests_json: Mapped[list[dict[str, Any]]]
    review_configs_json: Mapped[list[dict[str, Any]]]
    decision_json: Mapped[dict[str, Any] | None]
    status: Mapped[str]
    created_at: Mapped[datetime]
    decided_at: Mapped[datetime | None]
```

잠긴 설계 문서는 이 테이블을 감사 로그와 관리 화면용으로 둔다고 적는다.

```text
LangGraph interrupt state의 원천은 checkpoint다.
이 테이블은 서비스 감사 로그와 관리 화면용이다.
```

그런데 현재 소스 트리 검색 결과는 아래에 가깝다.

```text
src/agent/repositories
-> workspace.py만 있음

agent_hitl_events
-> 모델 정의만 있음
-> 저장 repository 없음
-> 조회 route 없음
-> refresh 복구에서 직접 쓰는 경로 없음
```

그래서 interrupted thread를 다시 열 때 앱 DB는  
`pending interrupt`, `decided interrupt`, `review config snapshot`을  
별도 워크스페이스 레코드로 복구하지 못한다.  
현재 복구는 LangGraph thread state와 프런트 hydrate에 거의 전부 의존한다.

## langgraph-api

현재 프로젝트 버전:

```text
frontend
-> @langchain/react 1.0.24
-> @langchain/langgraph-sdk 1.9.23

backend/services/agent-service
-> langgraph-api 0.10.0
-> langgraph 1.2.6
```

LangChain Agent Server changelog는 2026-06-18 `v0.11.0rc4`에서  
Event Streaming v2의 HTTP `input.respond`가 reconnect, redeploy,  
thread-state lookup failure 뒤 잘못 실패하던 문제를 고쳤다고 적는다.

```text
Fixed HTTP input.respond validation for Event Streaming v2
to read pending interrupts from the durable thread row
instead of rebuilding thread state,
preventing valid HITL resumes from incorrectly returning
no_such_interrupt after reconnects, redeploys,
or thread-state lookup failures.
```

현재 예제는 refresh 뒤 interrupted thread를 다시 여는 흐름을 강하게 타므로  
이 서버 버전 차이도 같이 확인해야 한다.

## 주요 파일

- `src/app/example/chat/[threadId]/page.tsx`
- `src/features/llm-chat/components/workspace/chat-workspace-thread-view.tsx`
- `src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`
- `src/features/llm-chat/lib/workspace/parse-thread-state-messages.ts`
- `src/features/llm-chat/components/workspace/chat-thread-sidebar.tsx`
- `src/features/llm-chat/lib/workspace/map-thread-item.ts`
- `src/features/llm-chat/stores/use-tool-policy-store.ts`
- `src/features/llm-chat/stores/use-chat-model-selection-store.ts`
- `src/features/llm-chat/providers/chat-workspace-ui-provider.tsx`
- `src/features/auth/lib/fetch-with-auth.ts`
- `src/features/auth/components/header/header-auth-logout-button.tsx`
- `src/app/providers.tsx`
- `backend/services/agent-service/src/agent/db/models.py`
- `backend/services/agent-service/src/agent/services/workspace/service.py`
- `frontend/package.json`
- `backend/services/agent-service/pyproject.toml`

## 참고 문서

- LangChain React `useStream`: `https://reference.langchain.com/javascript/langchain-react/use-stream`
- LangSmith Threads: `https://docs.langcåhain.com/langsmith/use-threads`
- Agent Server Protocol V2 Command: `https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command`
- Agent Server changelog: `https://docs.langchain.com/langsmith/agent-server-changelog`

---이전대화맥락---

이제 랭그래프리액트, 리액트쿼리, better-auth를 읽어보고
최대한 깔끔하게 다시 수정할거야
하위호환 코드나 불필요한 방어코드도 빼면서 완벽하게 들어갈건데
최대한 유닛테스트도 잘 넣도록 쭉쭉 진행할거야
작업하면서 코드에는 공식문서 링크와 함께 한국어 주석을 남길거야.



4:40 PM






지금은 구현에 바로 들어가지 않고, 수정 계획이 흔들리지 않도록 기준부터 잡겠습니다. 저장소의 현재 구조와 테스트 체계, 그리고 @langchain/react·@tanstack/react-query·better-auth 공식 문서를 함께 대조해서 어떤 수준까지 정리할지 먼저 확정할게요.




Read 2 files and searched code, searched the webjavascript langchain react useStream official | reference.langchain.com







Read package.json

Read pyproject.toml

Searched for vitest|jest|testing-library|msw|QueryClient|queryConfig|better-auth|useStream|LangGraphChatStreamProvider|fetchWithAuth|signOut\(|useSession\( in frontend












현재 프런트는 이미 vitest 기반 테스트와 @langchain/react 기반 스트림 래퍼가 깔려 있어서, 무에서 새로 짜는 작업은 아니네요. 대신 어디까지 걷어내고 어떤 레이어를 단일화할지를 계획에서 먼저 못 박아야 구현 중에 흔들리지 않겠습니다.




Read 12 files and searched code, searched the web


테스트 기반도 확인해두는 편이 좋아서, 지금 있는 llm-chat·auth 쪽 단위 테스트가 어떤 상태인지 읽는 용도로 한 번 돌려볼게요. 실패하더라도 구현은 안 건드리고, 계획에 “현재 베이스라인”으로 반영하겠습니다.




Ran 4 commands, searched the webRan npm test -- --run frontend/src/features/llm-chat frontend/src/features/auth







Ran npm test -- src/features/llm-chat src/features/auth







Ran uv pip show langgraph-api langgraph langgraph-sdk | sed -n '1,240p'







Ran npm ls @langchain/react @langchain/langgraph-sdk @tanstack/react-query better-auth







https://tanstack.com/query/latest/docs/reference/QueryClient

'Signout' in https://better-auth.com/docs/basic-usage

"Mount it once per thread" | reference.langchain.com

https://reference.langchain.com/javascript/langchain-react/use-stream












공식 문서 쪽은 웹 툴보다 curl이 더 안정적으로 읽히네요. useStream·QueryClient·createAuthClient의 핵심 가이드 문구를 그대로 확인해서, 나중에 코드 주석에 남길 링크 기준까지 맞춰두겠습니다.




Ran 4 commands, searched the webRan curl -L -s https://reference.langchain.com/javascript/langchain-react/use-stream | rg -n "Mount it once per thread|initialValues|threadId|interrupts|hydrates|hydrate" -n -C 2







Ran curl -L -s https://better-auth.com/docs/concepts/client | rg -n "createAuthClient|baseURL|sessionOptions|useSession|fetchOptions" -n -C 2







Ran curl -L -s https://tanstack.com/query/latest/docs/reference/QueryClient | rg -n "queryClient.clear|queryClient.removeQueries|queryClient.resetQueries|removeQueries|resetQueries|clear" -n -C 2







Ran curl -L -s https://better-auth.com/docs/basic-usage | rg -n "Signout|signOut|useSession|getSession|TanStack Query" -n -C 2







getAccessToken Better Auth client genericOAuth official | better-auth.com












여기까지 확인한 기준은 꽤 분명해졌어요. @langchain/react는 useStream을 “thread당 한 번만 mount”하고 threadId 변경 시 hydrate/resubscribe 하라고 안내하고, Better Auth는 useSession이 sign-out 변화를 즉시 반영한다고 설명하며, TanStack Query는 clear·removeQueries·resetQueries를 서로 다른 의미로 구분합니다. 현재 코드도 llm-chat·auth 테스트 20개 파일 68개가 모두 통과하는 상태라, 리팩터링은 “동작을 고친 뒤 테스트 수준을 올리는 작업”으로 잡을 수 있어요.
몇 가지는 구현 전에 방향을 잠가두는 게 좋겠습니다. 아래 선택만 정해지면 바로 결정 완료된 작업 계획으로 묶어드릴게요.




Asked 3 questions이번 정리 범위를 어디까지 잡을까요?프론트+백엔드 (Recommended)
채팅 상태 복원 구조는 어떤 방향으로 정리할까요?단일 소스 정리 (Recommended)
테스트 깊이는 어디까지 가져갈까요?단위+통합 (Recommended)





방향은 잘 잠겼어요. 이제 계획이 구현자에게 바로 넘어가도 되려면, thread settings와 resume context를 어디서 복원할지까지 결정해야 해서 관련 워크스페이스/설정 경로를 조금 더 읽고 마무리하겠습니다.




Read 5 files and searched code


한 군데 더 보니, 스레드 설정 API는 이미 있는데 프런트 llm-chat에서 거의 안 쓰고 있네요. 그래서 계획은 단순 버그픽스보다 “이미 있는 서버 설정 저장소를 실제 진실원으로 연결하느냐”까지 정해야 깔끔해집니다.




Read 4 files and searched codeRead nodes.py

Searched for selected_document_ids|selected_artifact_ids|context_schema|interrupt_on|allowed_tools|reasoning_effort|model in chat

Read build-submit-config.ts

Read system_context_state.py

Read context.py












한 가지 더 잠그면 계획이 훨씬 명확해져요. 지금 백엔드에는 과거/수동 호출까지 버티기 위한 기본값 보정이 섞여 있는데, 이걸 얼마나 강하게 정리할지 선택해두면 구현 중 판단이 안 갈립니다.




Asked 1 question프런트-백엔드 실행 컨텍스트 계약은 얼마나 엄격하게 가져갈까요?엄격하게 계약하고 방어코드/하위호환코드 전부 삭제





업그레이드 범위까지 포함하기로 했으니, langgraph-api 쪽은 막연히 “최신으로”가 아니라 실제로 어디까지 올릴지 확인하고 있어요. 이건 계획서에서 목표 버전을 애매하게 남기지 않으려는 확인 단계입니다.




Ran 6 commands


Worked for 6m 48s




중요한 사실이 하나 나왔어요. langgraph-api는 지금 PyPI 기준 최신 안정판이 여전히 0.10.0이고, 제가 전에 찾았던 HITL reconnect 관련 수정은 공식 changelog 상 0.11.0rc4 프리릴리스에 적혀 있습니다. 즉 “백엔드도 포함”으로 가더라도, 이 부분은 안정판 안에서 자체 보완할지, 프리릴리스까지 올릴지 선택이 필요합니다.




Asked 1 question`langgraph-api` 쪽은 프리릴리스까지 허용할까요?안정판으로 진행하고, HITL복구는 직접 구현하되 한국어주석과 공식문서링크주석을 같이 남겨서 유지보수가 가능하게 한다.





Read 2 files and searched codeRead chat-app.tsx

Searched for StateGraph|approval_gate|call_tools_with_approval|call_chat_model|chat graph|workflow in chat

Read graph.py

---실행계획---

# `example/chat` 정리 리팩터링 계획

## 요약

- `@langchain/react useStream`을 `example/chat`의 유일한 스레드 상태 원천으로 고정한다. `messages`·`interrupts`·hydrate error를 서로 다른 경로에서 복원하는 구조는 제거한다.
- `React Query`는 서버 상태만 맡기고, 현재 `Zustand`에 흩어진 스레드 설정/세션 잔존 상태는 스레드 설정 API와 명시적 로그아웃 정리 루틴으로 재구성한다.
- `Better Auth` 기반 인증 fetch 경로를 하나로 합치고, `401`/토큰 누락/로그아웃 후 재진입을 문자열 파싱이 아닌 타입화된 오류 흐름으로 정리한다.
- 백엔드는 안정판 유지(`langgraph-api 0.10.0`)를 전제로, `agent_hitl_events`와 `agent_threads`를 실제로 사용해 HITL pending context 복구와 스레드 메타데이터 동기화를 직접 구현한다.
- 프런트/백엔드 모두 하위호환용 기본값 보정은 제거한다. 현재 앱이 보내야 하는 실행 context는 엄격하게 검증하고, 누락 시 명시적으로 실패시킨다.

## 구현 변경

### 1. 스트림/워크스페이스 상태 구조

- `ChatWorkspaceThreadView`에서 `/threads/{langgraph_thread_id}/state`를 수동 조회해 `initialValues.messages`를 만드는 로직을 제거한다.
- 워크스페이스 스레드 화면은 `useStream({ threadId })`만 사용해 hydrate 하며, 초기 로딩 동안은 skeleton/loading UI를 보여주고 hydrate 완료 후 메시지/interrupt를 렌더링한다.
- `LangGraphChatStreamProvider`는 모델/도구 store를 직접 받지 않고, `getRuntimeContext(mode)` 같은 단일 인터페이스만 받아 `submit`과 `respond`에서 같은 계약을 사용한다.
- `submit`은 현재 스레드 설정에서 만든 context를 사용한다. `resume`은 pending HITL snapshot의 context를 우선 사용한다.
- interrupt가 pending인 동안에는 모델 선택, 도구 정책, 문서/아티팩트 선택 UI를 snapshot 기준으로 잠그고, 사용자가 refresh 후에도 다른 context로 resume하지 못하게 한다.
- `ChatApp`과 `example/chat`은 같은 strict context 계약을 쓰되, `app_thread_id`는 워크스페이스 경로에서만 필수로 강제한다.
- 현재 `useChatModelSelectionStore`, `useToolPolicyStore`는 워크스페이스 경로에서 제거하거나 thread-scoped local state로 축소한다. 전역 in-memory store로 실행 context를 유지하지 않는다.
- 스레드 설정(`model`, `reasoning_effort`, `allowed_tools`, `interrupt_on`)은 기존 `/threads/{thread_id}/settings` API를 실제 진실원으로 사용한다.
- 설정 변경은 즉시 mutation으로 저장하고 React Query 캐시를 optimistic update 한다.

### 2. 인증/세션/React Query 정리

- `fetchWithAuth`와 `langGraphFetch`를 공통 인증 fetch 유틸 하나로 합친다.
- 이 유틸은 `Better Auth getAccessToken` 호출, `Authorization` 주입, `401`/토큰 누락 오류 변환을 한 곳에서 처리한다.
- `toLocalNotice()`의 문자열 includes 기반 분기는 제거하고, `AuthSessionError`, `HttpStatusError`, `AlreadyConsumedInterruptError` 같은 명시적 오류 타입으로 바꾼다.
- 로그아웃 성공 시 `signOut` 후 `queryClient.clear()`로 사용자별 React Query 캐시를 전부 비우고, 채팅 관련 local state reset 함수를 함께 호출한 뒤 `router.replace("/")`로 이동한다.
- 현재 코드에 남아 있는 `:contentReference[...]` 형태 주석은 전부 제거하고, 유지할 주석은 한국어 + 공식 문서 URL만 남긴다.
- 공식 문서 링크 주석은 비명확한 경계에만 남긴다.
  - `useStream` hydrate/resume 계약
  - Better Auth client/session/signOut 계약
  - React Query cache clear/remove/reset 선택 이유
  - LangGraph runtime context/Protocol V2 command 계약

### 3. 백엔드 HITL/메타데이터 정리

- `agent_threads` 메타데이터는 그래프 실행 중 서버가 직접 갱신한다. 프런트가 별도 sync를 책임지지 않는다.
- `chat_model` 다음에 워크스페이스 메타데이터 sync node를 추가해, interrupt 직전 상태도 `message_count`, `last_message_preview`, `last_message_at`에 반영한다.
- `message_count`는 UI에 실제 보이는 human/ai 메시지 기준으로 계산하고, system/tool 전용 메시지는 제외한다.
- `last_message_preview`는 최신 visible human/ai 텍스트를 사용하고, 텍스트가 없고 tool-call만 있으면 도구 호출 요약 문자열을 저장한다.
- `agent_hitl_events`를 실제 pending HITL 복구 저장소로 사용한다.
- `approval_gate`에서 interrupt를 만들 때 pending event를 upsert 하고, 여기에 `interrupt_id`, `action_requests_json`, `review_configs_json`, `run_context_json`, `status="pending"`를 저장한다.
- `call_tools_with_approval` 진입 시 해당 pending event를 `decided`로 전환하고 `decisions_json`, `decided_at`를 저장한다.
- 같은 스레드에 새 pending interrupt가 생기면 이전 pending event는 `superseded` 상태로 닫는다.
- 백엔드 runtime context는 더 이상 조용히 기본값을 채우지 않는다. `model`, `reasoning_effort`, `allowed_tools`, `interrupt_on`이 없으면 명시적 validation error를 반환한다.
- `selected_document_ids`, `selected_artifact_ids`는 optional로 유지하되, 있으면 타입/소유권 검증에 실패할 때 바로 오류를 반환한다.
- `langgraph-api`는 안정판 유지다. upstream prerelease에 기대지 않고 현재 앱 코드와 저장소만으로 HITL refresh/resume 문제를 해소한다.

## 공개 인터페이스 / 타입 변경

- 새 워크스페이스 API를 추가한다.
  - `GET /api/v1/agent/threads/{thread_id}/hitl/pending`
  - 응답: `interrupt_id`, `status`, `action_requests`, `review_configs`, `run_context`, `created_at`, `decided_at`
- `agent_hitl_events` 스키마를 정리한다.
  - `decision_json`은 제거하고 `decisions_json`으로 변경한다.
  - `run_context_json`을 추가한다.
  - `status`는 최소 `pending | decided | superseded`를 사용한다.
- 프런트의 실행 context 타입을 엄격화한다.
  - `model`, `reasoning_effort`, `allowed_tools`, `interrupt_on`은 required
  - `selected_document_ids`, `selected_artifact_ids`는 optional
  - `app_thread_id`는 workspace submit path에서 required
- `LangGraphChatStreamProvider` props는 `modelSelection`/`toolPolicy` 직접 주입 대신 단일 runtime context 공급 인터페이스로 변경한다.

## 테스트 계획

- 프런트 단위 테스트
  - 공통 auth fetch가 토큰 누락, `401`, 정상 응답을 올바른 오류 타입/본문으로 변환하는지 검증
  - stream provider가 `submit`과 `resume`에 서로 다른 context source를 정확히 쓰는지 검증
  - pending HITL snapshot이 있을 때 UI 설정이 snapshot으로 고정되는지 검증
  - 로그아웃 버튼이 `signOut` 성공 후 query cache clear, local state reset, redirect를 수행하는지 검증
- 프런트 통합 테스트
  - 워크스페이스 스레드 진입 시 수동 thread state fetch 없이 `useStream` hydrate만으로 이전 메시지와 interrupt가 복원되는지 검증
  - refresh-equivalent remount 후 pending HITL가 다시 뜰 때 model/tool/doc/artifact context가 바뀌지 않는지 검증
  - 예전 세션 페이지 진입 시 sidebar preview/count와 본문 메시지가 함께 보이는지 검증
- 백엔드 단위 테스트
  - thread metadata sync가 visible 메시지 기준으로 `message_count`, `last_message_preview`, `last_message_at`를 정확히 갱신하는지 검증
  - `approval_gate`가 pending HITL event를 저장하고, `call_tools_with_approval`가 결정 완료로 전환하는지 검증
  - strict runtime context validation이 누락 필드에서 실패하고, 정상 context에서는 통과하는지 검증
- 백엔드 통합/그래프 테스트
  - interrupt 생성 -> refresh 이후 pending snapshot 조회 -> resume -> decided 전환 흐름 검증
  - logout/login 이후 같은 스레드를 다시 열어도 stale app DB 상태와 현재 LangGraph thread 상태가 충돌하지 않는지 검증
- 수동 검증 시나리오
  - pending HITL 상태에서 새로고침
  - pending HITL 상태에서 로그아웃 후 재로그인
  - 이전 세션 직접 진입
  - tool policy 변경 후 interrupt 발생, refresh 뒤 resume
  - 문서/아티팩트 선택 후 interrupt 발생, refresh 뒤 resume

## 가정과 기본값

- 의존성은 안정판만 사용한다. `langgraph-api` prerelease는 도입하지 않는다.
- 이번 작업은 `example/chat`을 기준으로 설계하되, 공통 `llm-chat`/`auth` 레이어는 함께 정리한다.
- 주석은 한국어로 작성하고, 공식 문서 링크는 유지보수 가치가 있는 경계 로직에만 남긴다.
- 하위호환/무음 fallback은 제거한다. 실패는 명시적으로 드러내고, 테스트로 계약을 고정한다.
