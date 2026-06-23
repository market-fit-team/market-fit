# agent workspace

`src/agent/webapp.py`는 LangGraph native API 옆에 사용자별 워크스페이스 API를 붙인다.

```text
/threads/*
-> Agent Server checkpoint와 stream

/api/v1/agent/*
-> agent-service PostgreSQL
-> 스레드 목록, 설정, 메모리, 아티팩트, 문서, 피드백, 성향 연결
```

`src/agent/security/auth.py`의 `owner_only()`는 native thread, run, store 리소스에
JWT `sub`를 `metadata.owner`로 기록하고 같은 값으로 조회를 제한한다.

```py
@auth.on
async def owner_only(ctx: Auth.types.AuthContext, value: dict[str, Any]) -> dict[str, str]:
    metadata = value.setdefault("metadata", {})
    metadata["owner"] = ctx.user.identity
    return {"owner": ctx.user.identity}
```

custom route는 `src/agent/api/deps.py`에서 같은 JWT를 다시 검증한다.
DB 조회는 항상 `auth_user_uuid == user.identity` 조건을 포함한다.

## PostgreSQL

`src/agent/db/models.py`에 워크스페이스 테이블이 모여 있다.

```text
agent_threads
agent_thread_settings
agent_user_preferences
agent_memories
agent_thread_onboarding_contexts
agent_onboarding_context_events
agent_artifacts
agent_documents
agent_message_attachments
agent_message_feedback
agent_hitl_events
```

LangGraph checkpoint 테이블은 이 모델에 넣지 않는다.
Agent Server가 native thread state를 소유한다.

`docker-compose.yml`의 `agent-db`는 앱 테이블 전용 PostgreSQL이다.

```yaml
DATABASE_URL: postgresql+asyncpg://agent:agent@agent-db:5432/agent
AUTO_CREATE_SCHEMA: "true"
```

## API

`src/agent/api/routes/workspace.py`가 아래 경로를 등록한다.

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
POST   /api/v1/agent/artifacts
GET    /api/v1/agent/artifacts/{artifact_id}
PATCH  /api/v1/agent/artifacts/{artifact_id}
DELETE /api/v1/agent/artifacts/{artifact_id}

GET    /api/v1/agent/documents
POST   /api/v1/agent/documents
DELETE /api/v1/agent/documents/{document_id}
POST   /api/v1/agent/threads/{thread_id}/attachments

POST   /api/v1/agent/messages/{message_id}/feedback

GET    /api/v1/agent/threads/{thread_id}/onboarding-context
PUT    /api/v1/agent/threads/{thread_id}/onboarding-context
DELETE /api/v1/agent/threads/{thread_id}/onboarding-context
```

`POST /api/v1/agent/threads`는 native thread를 먼저 만들고 반환된
`thread_id`를 `agent_threads.langgraph_thread_id`에 저장한다.

```text
JWT
-> POST Agent Server /threads
-> metadata.owner = JWT sub
-> agent_threads insert
-> agent_thread_settings insert
```

## 도구

`src/agent/services/chat/toolkits/chat_toolkit.py`는 계산기 도구와 워크스페이스 도구를
한 registry로 검증한다.

```text
읽기
memory_search
artifact_get
document_search
document_read
onboarding_get_default_profile
onboarding_get_survey_result
onboarding_get_area_recommendations
onboarding_preview_profile_update

쓰기
memory_create
memory_update
memory_delete
artifact_create
artifact_update
artifact_delete
document_delete
onboarding_commit_profile_update
```

쓰기 도구는 모두 `default_allowed=False`다.
`approval_gate()`가 approve, edit, reject, respond 결정을 받은 뒤에만 실행한다.

도구는 `ToolRuntime.config.configurable.langgraph_auth_user`에서 사용자를 읽는다.
클라이언트가 전달한 사용자 ID는 소유권 판단에 쓰지 않는다.

`artifact_create`와 `onboarding_commit_profile_update`는
`Runtime.context.app_thread_id`로 앱 스레드를 찾고 다시 소유권을 검사한다.

## 성향 갱신

`backend/services/onboarding-service/app/api/routes.py`에 두 경로가 추가됐다.

```text
POST /surveys/me/profile/preview-update
POST /surveys/me/profile/commit-update
```

preview는 0~1 범위의 유저타워 축 패치를 검증하고 추천 변경안을 계산한다.
DB에 새 결과를 만들지 않는다.

commit은 같은 계산을 수행한 뒤 새 `result_code`를 만들고 사용자의 기본 프로필을
새 결과로 교체한다.

```json
{
  "base_result_code": "r0a1b2c3d4e5f6g",
  "patch": {
    "budget_level": 0.58,
    "subway_dependency_level": 0.72
  },
  "evidence": [
    {
      "message_id": "msg_example",
      "quote": "역세권은 꼭 필요해요."
    }
  ]
}
```

commit tool은 반환된 `result_code`를 `agent_thread_onboarding_contexts`에 연결하고
변경 이벤트를 `agent_onboarding_context_events`에 남긴다.

## 프론트 실행 컨텍스트

`frontend/src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`는
선택된 워크스페이스 스레드의 두 ID를 나눠 쓴다.

```text
workspaceThread.langgraphThreadId
-> useStream threadId

workspaceThread.appThreadId
-> config.configurable.app_thread_id
-> artifact/onboarding mutation tool ownership lookup
```

## 테스트

```text
tests/unit_tests/test_database_models.py
tests/unit_tests/test_workspace_service.py
tests/unit_tests/test_workspace_tools.py
```

`test_workspace_service.py`는 SQLite async 세션과 가짜 Agent Server client를 쓴다.
외부 PostgreSQL, JWT 서버, 모델 provider 없이 소유권과 트랜잭션을 검증한다.

## 주요 파일

- `src/agent/api/deps.py`
- `src/agent/api/routes/workspace.py`
- `src/agent/clients/agent_server.py`
- `src/agent/clients/onboarding_service.py`
- `src/agent/db/models.py`
- `src/agent/db/session.py`
- `src/agent/repositories/workspace.py`
- `src/agent/schemas/workspace.py`
- `src/agent/security/auth.py`
- `src/agent/services/workspace/service.py`
- `src/agent/services/chat/tools/runtime_user.py`
- `src/agent/services/chat/tools/memory_tool/memory_tool.py`
- `src/agent/services/chat/tools/artifact_tool/artifact_tool.py`
- `src/agent/services/chat/tools/document_tool/document_tool.py`
- `src/agent/services/chat/tools/onboarding_tool/onboarding_tool.py`
- `tests/unit_tests/test_database_models.py`
- `tests/unit_tests/test_workspace_service.py`
- `tests/unit_tests/test_workspace_tools.py`

## 참고 문서

- LangGraph authentication and access control: `https://docs.langchain.com/langsmith/auth`
- LangGraph persistence: `https://docs.langchain.com/oss/python/langgraph/persistence`
- LangGraph interrupts: `https://docs.langchain.com/oss/python/langgraph/interrupts`
- LangGraph runtime context: `https://reference.langchain.com/python/langgraph/runtime/Runtime`
- SQLAlchemy asyncio: `https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html`
- FastAPI bigger applications: `https://fastapi.tiangolo.com/tutorial/bigger-applications/`
