# PostgreSQL and persistence

`agent-service`는 PostgreSQL을 두 경계로 쓴다.

```text
LangGraph persistence
-> graph state 원본
-> messages
-> tool calls
-> interrupts
-> checkpoints
```

```text
agent-service app tables
-> design4 워크스페이스 조회용 데이터
-> 사용자 소유권
-> 목록/설정/메모리/아티팩트/감사 로그
```

## LangGraph persistence

`src/agent/services/chat/graph.py`는 checkpointer를 직접 붙이지 않는다.

```py
def _build_chat_graph() -> Any:
    builder = StateGraph(ChatState, context_schema=ChatRuntimeContext)
    ...
    return builder.compile()
```

`docs/chat-graph.md`는 상태 저장을 Agent Server thread/checkpoint 쪽에 둔다.

```text
POST /threads
POST /threads/{thread_id}/stream/events
POST /threads/{thread_id}/commands
```

프론트는 `threadId`를 `useStream`에 넘겨 이전 thread state를 다시 읽는다.

## app/db

`onboarding-service`의 SQLAlchemy async 구조를 agent-service에도 둔다.

```text
src/agent/db/
  base.py
  models.py
  session.py
```

```py
_ENGINE: AsyncEngine | None = None
_SESSION_FACTORY: async_sessionmaker[AsyncSession] | None = None

def get_engine() -> AsyncEngine:
    ...

async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with get_session_factory()() as session:
        yield session
```

`src/agent/core/config.py`에 agent-service app DB 값을 추가한다.

```py
class Settings(BaseSettings):
    database_url: str
    database_echo: bool = False
    auto_create_schema: bool = True
```

## agent_threads

design4의 `ThreadList`가 읽는 목록 테이블이다.

```text
agent_threads
+ id uuid pk
+ auth_user_uuid string indexed
+ langgraph_thread_id string unique
+ title string
+ subtitle string nullable
+ last_message_preview string nullable
+ message_count integer
+ is_pinned boolean
+ is_archived boolean
+ deleted_at timestamptz nullable
+ last_message_at timestamptz nullable
+ created_at timestamptz
+ updated_at timestamptz
```

```text
GET /api/v1/agent/threads
-> auth_user_uuid
-> agent_threads where deleted_at is null
-> pinned first, last_message_at desc
```

## agent_thread_settings

`ChatRuntimeContext`의 기본값을 thread 단위로 저장한다.

```py
class ChatRuntimeContext(TypedDict):
    model: NotRequired[str]
    reasoning_effort: NotRequired[ReasoningEffort]
    allowed_tools: NotRequired[list[str]]
    interrupt_on: NotRequired[InterruptOnConfig]
```

```text
agent_thread_settings
+ id uuid pk
+ thread_id uuid fk agent_threads.id
+ model string nullable
+ reasoning_effort string nullable
+ allowed_tools_json json
+ interrupt_on_json json
+ created_at timestamptz
+ updated_at timestamptz
```

## agent_user_preferences

새 thread 생성 시 복사할 사용자 기본값이다.

```text
agent_user_preferences
+ id uuid pk
+ auth_user_uuid string unique
+ default_model string nullable
+ default_reasoning_effort string nullable
+ default_allowed_tools_json json
+ default_interrupt_on_json json
+ sidebar_tab string nullable
+ document_view_mode string nullable
+ panel_layout_json json
+ created_at timestamptz
+ updated_at timestamptz
```

## 닫히는 단위

```text
src/agent/db/base.py
src/agent/db/models.py
src/agent/db/session.py
src/agent/core/config.py
tests/unit_tests/test_database_models.py
```

```text
uv run pytest tests/unit_tests/test_database_models.py
```

## 주요 파일

- `src/agent/core/config.py`
- `src/agent/security/auth.py`
- `src/agent/services/chat/graph.py`
- `docs/chat-graph.md`
- `backend/services/onboarding-service/app/db/models.py`
- `backend/services/onboarding-service/app/db/session.py`

## 참고 문서

- LangGraph Persistence: `https://docs.langchain.com/oss/python/langgraph/persistence`
- LangGraph Postgres checkpoint reference: `https://reference.langchain.com/python/langgraph.checkpoint.postgres`
