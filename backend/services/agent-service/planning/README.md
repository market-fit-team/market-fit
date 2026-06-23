# agent-service planning

`frontend/src/app/agent/design4`는 세션 목록, 채팅, 문서 패널, 메모리 패널, 아티팩트 패널을 한 화면에 둔다.  
실제 구현은 `@langchain/react`와 Orval generated hook을 같이 쓴다.

```text
브라우저
-> @langchain/react useStream
-> /api/agent/threads/{thread_id}/stream/events
-> /api/agent/threads/{thread_id}/commands
-> LangGraph chat graph
-> tool call / interrupt / ToolMessage / AIMessage
```

```text
브라우저
-> Orval generated hook
-> /api/agent/api/v1/agent/*
-> src/agent/webapp.py
-> service
-> repository
-> agent-service PostgreSQL
```

LangGraph stream events는 대화 실행 결과의 원천이다.  
FastAPI custom route는 design4 워크스페이스 관리 화면이 직접 누르는 API다.  
tool은 AI가 대화 중 필요한 데이터를 읽거나 side effect를 만들 때 호출한다.

## stream events

`frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`는 `@langchain/react`의 `useStream`을 쓴다.

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

design4에서 보이는 아래 UI는 stream projection을 읽어 렌더링한다.

```text
messages
-> 사용자/AI/ToolMessage 본문

toolCalls
-> 도구 호출 카드
-> 문서 조회, 성향 조회, 리포트 생성, 메모리 검색 상태

interrupts
-> HITL 승인 카드
-> approve / edit / reject / respond
```

아티팩트, 검색 결과, 성향 분석 패널은 tool result 메시지와 AIMessage content를 프론트가 읽어서 연다.  
agent-service가 design4 전용 메시지 DTO를 따로 만들지 않는다.

## PostgreSQL

PostgreSQL에는 두 종류의 데이터가 들어간다.

```text
LangGraph persistence
-> thread state
-> messages
-> tool calls
-> interrupts
-> resume state
-> stream rejoin state
```

```text
agent-service app tables
-> 사용자별 세션 목록
-> 세션 설정
-> 사용자 메모리
-> 저장된 아티팩트
-> 문서 메타데이터와 첨부 이력
-> HITL 감사 로그
-> 메시지 피드백
-> onboarding result_code 연결
-> onboarding result_code 변경 이력
-> UI 개인 설정
```

`auth_user_uuid`는 `src/agent/security/auth.py`가 검증한 JWT `sub`를 쓴다.

```py
return {
    "identity": subject,
    "email": payload.get("email"),
    "name": payload.get("name"),
    "claims": payload,
}
```

## FastAPI custom routes

`src/agent/webapp.py`는 현재 모델/도구 catalog만 낸다.

```py
@app.get("/api/v1/llm/tools", response_model=ListChatToolsResponse, tags=["llm"])
async def list_llm_tools(_: DocumentedBearerAuth) -> ListChatToolsResponse:
    return ListChatToolsResponse(tools=list_chat_tools())

@app.get("/api/v1/llm/models", response_model=ListChatModelsResponse, tags=["llm"])
async def list_llm_models(_: DocumentedBearerAuth) -> ListChatModelsResponse:
    return await list_chat_models()
```

design4 워크스페이스 API는 같은 FastAPI app에 추가한다.

```text
GET    /api/v1/agent/threads
POST   /api/v1/agent/threads
PATCH  /api/v1/agent/threads/{thread_id}
DELETE /api/v1/agent/threads/{thread_id}

GET    /api/v1/agent/threads/{thread_id}/settings
PUT    /api/v1/agent/threads/{thread_id}/settings

GET    /api/v1/agent/memories
POST   /api/v1/agent/memories
PATCH  /api/v1/agent/memories/{memory_id}
DELETE /api/v1/agent/memories/{memory_id}

GET    /api/v1/agent/artifacts
GET    /api/v1/agent/artifacts/{artifact_id}
PATCH  /api/v1/agent/artifacts/{artifact_id}
DELETE /api/v1/agent/artifacts/{artifact_id}

GET    /api/v1/agent/documents
POST   /api/v1/agent/threads/{thread_id}/attachments

POST   /api/v1/agent/messages/{message_id}/feedback

GET    /api/v1/agent/threads/{thread_id}/onboarding-context
PUT    /api/v1/agent/threads/{thread_id}/onboarding-context
DELETE /api/v1/agent/threads/{thread_id}/onboarding-context
```

프론트는 이 경로를 Orval generated hook으로 호출한다.

## tools

`src/agent/services/chat/toolkits/chat_toolkit.py`가 chat graph에 bind할 tool registry를 만든다.

```py
CHAT_TOOL_SPECS: Final[tuple[ToolSpec, ...]] = validate_tool_specs((*CALCULATOR_TOOL_SPECS,))
CHAT_TOOLS: Final[list[BaseTool]] = [spec.tool for spec in CHAT_TOOL_SPECS]
```

추가 tool은 기능 폴더별로 등록한다.

```text
src/agent/services/chat/tools/onboarding_tool/
src/agent/services/chat/tools/memory_tool/
src/agent/services/chat/tools/artifact_tool/
src/agent/services/chat/tools/document_tool/
src/agent/services/chat/tools/web_search_tool/
```

side effect가 있는 tool은 `default_allowed=False` 또는 `interrupt_on` 기본값으로 HITL을 건다.

```text
memory_create
memory_update
memory_delete
artifact_create
artifact_update
artifact_delete
onboarding_commit_profile_update
onboarding_set_thread_profile_context
document_delete
```

## onboarding-service

성향 결과 본문과 유저타워 결과는 onboarding-service가 소유한다.  
agent-service는 `result_code`와 연결 이력만 저장한다.

```text
agent thread
-> result_code
-> onboarding-service GET /surveys/results/{result_code}
-> onboarding-service GET /surveys/results/{result_code}/area-recommendations
```

채팅 중 성향이 바뀌면 agent가 onboarding tool을 호출한다.

```text
사용자 발화
-> onboarding_preview_profile_update
-> diff artifact stream
-> HITL approve
-> onboarding_commit_profile_update
-> 새 result_code
-> onboarding_set_thread_profile_context
-> agent_thread_onboarding_contexts 갱신
```

## 작업 문서

- `01-postgresql-and-persistence.md`
- `02-thread-session-api.md`
- `03-memory-and-context-tools.md`
- `04-onboarding-profile-update-flow.md`
- `05-artifacts-documents-feedback.md`
- `06-design4-frontend-integration.md`

## 주요 파일

- `langgraph.json`
- `langgraph.eval.json`
- `src/agent/webapp.py`
- `src/agent/security/auth.py`
- `src/agent/services/chat/graph.py`
- `src/agent/services/chat/state.py`
- `src/agent/services/chat/context.py`
- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `frontend/src/app/agent/design4/page.tsx`
- `frontend/src/app/agent/design4/_fixtures/mock-data.ts`
- `frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`

## 참고 문서

- LangGraph Persistence: `https://docs.langchain.com/oss/python/langgraph/persistence`
- LangChain frontend SDK overview: `https://docs.langchain.com/oss/python/langchain/frontend/overview`
- LangGraph threads: `https://docs.langchain.com/langsmith/use-threads`
- Orval docs: `https://orval.dev/docs`
