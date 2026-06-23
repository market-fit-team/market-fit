# thread session API

`frontend/src/app/agent/design4/_components/thread-list.tsx`는 사용자별 세션 목록을 요구한다.

```ts
export interface Thread {
  id: string
  title: string
  subtitle?: string
  updatedAt: string
  messageCount: number
  isPinned?: boolean
}
```

실제 API는 `langgraph_thread_id`와 app thread id를 같이 반환한다.

## src/agent/api/routes/threads.py

```py
@router.get("/api/v1/agent/threads", response_model=AgentThreadListResponse)
async def list_threads(
    user: CurrentUser,
    session: DbSession,
) -> AgentThreadListResponse:
    ...

@router.post("/api/v1/agent/threads", response_model=AgentThreadResponse)
async def create_thread(
    body: CreateAgentThreadRequest,
    user: CurrentUser,
    session: DbSession,
) -> AgentThreadResponse:
    ...
```

`POST /api/v1/agent/threads`는 app DB row를 만들고 LangGraph native `/threads`에서 받은 id를 저장한다.  
프론트는 반환된 `langgraph_thread_id`를 `useStream({ threadId })`에 넣는다.

## response

```json
{
  "threads": [
    {
      "id": "0c2b1e00-0000-4000-8000-000000000001",
      "langgraph_thread_id": "thread_abc",
      "title": "성수동 상권 분석",
      "subtitle": "제과점 추천과 임대료 리스크",
      "last_message_preview": "성수동은 목적형 방문 수요가 강합니다.",
      "message_count": 8,
      "is_pinned": true,
      "last_message_at": "2026-06-23T04:30:00Z",
      "created_at": "2026-06-23T04:00:00Z",
      "updated_at": "2026-06-23T04:30:00Z"
    }
  ]
}
```

## PATCH /api/v1/agent/threads/{thread_id}

ThreadList의 title, subtitle, pinned, archived 상태를 갱신한다.

```json
{
  "title": "성수동 제과점 리포트",
  "subtitle": "임대료와 주말 수요 중심",
  "is_pinned": true,
  "is_archived": false
}
```

## DELETE /api/v1/agent/threads/{thread_id}

소프트 삭제만 한다.

```text
DELETE /api/v1/agent/threads/{thread_id}
-> agent_threads.deleted_at = now()
-> LangGraph checkpoint row는 삭제하지 않음
```

LangGraph 원본 삭제는 별도 관리자/보존 정책이 정해진 뒤에 붙인다.

## title 생성

새 대화 직후 title은 `"새 대화"`로 둔다.  
첫 assistant 응답 뒤에는 agent가 title 후보를 만들거나 서버가 첫 user message를 잘라 저장한다.

```text
첫 user message
-> last_message_preview
-> title candidate
-> agent_threads updated_at
```

## settings

Thread 생성 시 `agent_user_preferences`를 `agent_thread_settings`로 복사한다.

```text
POST /api/v1/agent/threads
-> agent_threads insert
-> agent_thread_settings insert
-> response.langgraph_thread_id
```

## 닫히는 단위

```text
src/agent/api/routes/threads.py
src/agent/repositories/threads.py
src/agent/repositories/thread_settings.py
src/agent/schemas/threads.py
src/agent/services/threads/service.py
tests/unit_tests/test_thread_service.py
```

```text
uv run pytest tests/unit_tests/test_thread_service.py
```

## 주요 파일

- `src/agent/webapp.py`
- `src/agent/security/auth.py`
- `src/agent/services/chat/context.py`
- `frontend/src/app/agent/design4/_components/thread-list.tsx`
- `frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`

## 참고 문서

- LangGraph threads: `https://docs.langchain.com/langsmith/use-threads`
- Orval docs: `https://orval.dev/docs`
