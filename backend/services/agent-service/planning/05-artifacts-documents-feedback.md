# artifacts documents feedback

design4는 AI 응답 아래에 inline artifact를 보여주고, 우측 `DynamicPanel`에서 상세를 연다.

```ts
export type InlineArtifact =
  | CodeArtifact
  | MarkdownArtifact
  | AiReportArtifact
  | PersonalityAnalysisArtifact
```

아티팩트 표시의 원천은 LangGraph stream의 AIMessage, ToolMessage, toolCalls다.  
저장 가치가 있는 결과만 `agent_artifacts`에 남긴다.

## agent_artifacts

```text
agent_artifacts
+ id uuid pk
+ auth_user_uuid string indexed
+ thread_id uuid fk agent_threads.id
+ langgraph_thread_id string
+ source_message_id string nullable
+ source_tool_call_id string nullable
+ type string
+ title string
+ summary text nullable
+ version integer
+ content_json json
+ status string
+ created_at timestamptz
+ updated_at timestamptz
```

`type` 값은 아래 문자열로 시작한다.

```text
ai_report
code
markdown
search_report
personality_analysis_ref
```

`personality_analysis_ref`는 onboarding-service result_code를 가리킨다.  
성향 결과 본문을 agent-service에 복제하지 않는다.

## artifact tool

```text
artifact_create
artifact_update
artifact_get
artifact_delete
```

`artifact_create`와 `artifact_update`는 대화 중 리포트를 저장하거나 버전을 올릴 때 쓴다.

```py
@tool
async def artifact_create(
    thread_id: str,
    artifact_type: str,
    title: str,
    summary: str | None,
    content: dict[str, Any],
) -> ArtifactResponse:
    ...
```

side effect가 있으므로 HITL 대상이다.  
단순 `artifact_get`은 기본 허용할 수 있다.

## FastAPI artifacts

```text
GET    /api/v1/agent/artifacts
GET    /api/v1/agent/artifacts/{artifact_id}
PATCH  /api/v1/agent/artifacts/{artifact_id}
DELETE /api/v1/agent/artifacts/{artifact_id}
```

프론트는 저장된 리포트 목록/상세를 Orval hook으로 읽는다.  
stream 중 막 생성된 결과는 `@langchain/react` projection으로 먼저 보인다.

## agent_documents

`DocumentPanel`은 파일 목록, 드래그 첨부, 미리보기, 삭제 메뉴를 갖는다.

```ts
export interface DocumentItem {
  id: string
  name: string
  type: "tsx" | "ts" | "css" | "json" | "md" | "env" | "yaml"
  size: string
  updatedAt: string
  path: string
}
```

```text
agent_documents
+ id uuid pk
+ auth_user_uuid string indexed
+ name string
+ path string
+ type string
+ size_bytes integer nullable
+ content_ref string nullable
+ external_ref string nullable
+ metadata_json json
+ deleted_at timestamptz nullable
+ created_at timestamptz
+ updated_at timestamptz
```

처음 구현은 metadata만 저장한다.  
파일 본문 저장이나 vector index는 별도 document index 작업에서 붙인다.

## agent_message_attachments

사용자가 composer에 넣은 파일은 메시지 첨부 이력으로 남긴다.

```text
agent_message_attachments
+ id uuid pk
+ auth_user_uuid string indexed
+ thread_id uuid fk agent_threads.id
+ langgraph_thread_id string
+ message_id string
+ document_id uuid fk agent_documents.id
+ attached_snapshot_json json
+ created_at timestamptz
```

LangGraph 메시지에 들어가는 첨부 정보는 stream 원본에 남는다.  
이 테이블은 UI 목록과 감사 추적용이다.

## document tools

```text
document_search
document_read
document_attach
document_delete
```

`document_read`는 agent가 답변 중 파일 내용을 읽는 경로다.  
`document_delete`는 HITL 대상이다.

## message feedback

`ChatView`에는 assistant 메시지에 like/dislike가 있다.

```text
agent_message_feedback
+ id uuid pk
+ auth_user_uuid string indexed
+ thread_id uuid fk agent_threads.id
+ langgraph_thread_id string
+ message_id string
+ rating string
+ comment text nullable
+ created_at timestamptz
+ updated_at timestamptz
```

```text
POST /api/v1/agent/messages/{message_id}/feedback
```

```json
{
  "thread_id": "0c2b1e00-0000-4000-8000-000000000001",
  "rating": "like"
}
```

## HITL audit

```text
agent_hitl_events
+ id uuid pk
+ auth_user_uuid string indexed
+ thread_id uuid fk agent_threads.id
+ langgraph_thread_id string
+ interrupt_id string nullable
+ tool_call_id string nullable
+ action_requests_json json
+ review_configs_json json
+ decision_json json nullable
+ status string
+ created_at timestamptz
+ decided_at timestamptz nullable
```

LangGraph interrupt state의 원천은 checkpoint다.  
이 테이블은 서비스 감사 로그와 관리 화면용이다.

## 닫히는 단위

```text
src/agent/api/routes/artifacts.py
src/agent/api/routes/documents.py
src/agent/api/routes/feedback.py
src/agent/repositories/artifacts.py
src/agent/repositories/documents.py
src/agent/repositories/feedback.py
src/agent/repositories/hitl_events.py
src/agent/services/chat/tools/artifact_tool/
src/agent/services/chat/tools/document_tool/
tests/unit_tests/test_artifact_service.py
tests/unit_tests/test_document_service.py
tests/unit_tests/test_feedback_service.py
```

```text
uv run pytest tests/unit_tests/test_artifact_service.py tests/unit_tests/test_document_service.py tests/unit_tests/test_feedback_service.py
```

## 주요 파일

- `frontend/src/app/agent/design4/_components/chat-view.tsx`
- `frontend/src/app/agent/design4/_components/dynamic-panel.tsx`
- `frontend/src/app/agent/design4/_components/document-panel.tsx`
- `frontend/src/app/agent/design4/_fixtures/mock-data.ts`
- `src/agent/services/chat/approvals/nodes.py`
- `src/agent/services/chat/toolkits/chat_toolkit.py`

## 참고 문서

- LangChain frontend SDK overview: `https://docs.langchain.com/oss/python/langchain/frontend/overview`
- Orval docs: `https://orval.dev/docs`
