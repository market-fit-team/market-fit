# memory and context tools

`frontend/src/app/agent/design4/_components/memory-panel.tsx`는 사용자가 직접 메모리를 추가, 수정, 삭제한다.

```ts
export interface AiMemory {
  id: string
  content: string
  createdAt: string
}
```

FastAPI API는 패널 조작을 처리한다.  
LangGraph tool은 agent가 답변 전에 메모리를 검색하거나 사용자 승인 뒤 메모리를 바꿀 때 쓴다.

## agent_memories

```text
agent_memories
+ id uuid pk
+ auth_user_uuid string indexed
+ content text
+ source string
+ is_enabled boolean
+ deleted_at timestamptz nullable
+ created_at timestamptz
+ updated_at timestamptz
```

`source` 값은 아래 문자열로 시작한다.

```text
manual
agent_inferred
imported
```

## FastAPI

```text
GET    /api/v1/agent/memories
POST   /api/v1/agent/memories
PATCH  /api/v1/agent/memories/{memory_id}
DELETE /api/v1/agent/memories/{memory_id}
```

```json
{
  "content": "사용자는 주말 유동인구가 높은 상권을 선호한다."
}
```

```json
{
  "id": "8d934c00-0000-4000-8000-000000000001",
  "content": "사용자는 주말 유동인구가 높은 상권을 선호한다.",
  "source": "manual",
  "is_enabled": true,
  "created_at": "2026-06-23T04:30:00Z",
  "updated_at": "2026-06-23T04:30:00Z"
}
```

## memory_search

agent가 현재 사용자 메모리를 읽는다.

```py
@tool
async def memory_search(query: str, limit: int = 5) -> list[MemorySearchResult]:
    ...
```

처음 구현은 전문 검색 없이 최근 enabled memory를 반환한다.  
검색 인덱스가 붙으면 repository 내부만 바꾼다.

## memory_create / memory_update / memory_delete

사용자 기억을 바꾸는 tool은 side effect가 있다.

```text
memory_create
memory_update
memory_delete
-> default_allowed=False
-> allowed_decisions=["approve", "edit", "reject", "respond"]
```

`approval_gate()`는 `interrupt_on`에 따라 `HitlRequest`를 만든다.

```py
interrupt_payload: ApprovalInterruptPayload = {
    "action_requests": action_requests,
    "review_configs": review_configs,
}
resume_payload: ApprovalResumePayload = interrupt(interrupt_payload)
```

## prompt context

`memory_search` 결과는 ToolMessage로 들어간다.  
장기 메모리를 항상 system prompt에 직접 주입하지 않는다.

```text
user message
-> model decides memory_search
-> ToolMessage(memory results)
-> assistant answer
```

필요하면 thread 시작 시 enabled memory 요약을 context tool로 한 번 읽는다.

## 닫히는 단위

```text
src/agent/api/routes/memories.py
src/agent/repositories/memories.py
src/agent/schemas/memories.py
src/agent/services/memories/service.py
src/agent/services/chat/tools/memory_tool/
tests/unit_tests/test_memory_service.py
tests/unit_tests/test_memory_tool.py
```

```text
uv run pytest tests/unit_tests/test_memory_service.py tests/unit_tests/test_memory_tool.py
```

## 주요 파일

- `src/agent/services/chat/approvals/nodes.py`
- `src/agent/services/chat/approvals/policy.py`
- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `frontend/src/app/agent/design4/_components/memory-panel.tsx`
- `frontend/src/app/agent/design4/_components/memory-settings-modal.tsx`

## 참고 문서

- LangGraph memory: `https://docs.langchain.com/oss/python/langgraph/add-memory`
- LangGraph Persistence: `https://docs.langchain.com/oss/python/langgraph/persistence`
