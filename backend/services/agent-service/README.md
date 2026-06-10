# Pickle Agent Service

> 중요: 이 서비스는 Protocol V2 event streaming을 기준으로 동작한다.
> `tools` 채널은 legacy `/threads/{thread_id}/runs/stream`이 아니라 `/threads/{thread_id}/stream/events`에서만 구독한다.
> Docker/Compose 환경에는 `FF_V2_EVENT_STREAMING=true`가 반드시 필요하다.
> 프론트는 커스텀 SSE 파서가 아니라 공식 `@langchain/react` `useStream`의 built-in SSE transport를 사용한다.
> `sitecustomize.py` 및 `langgraph_api/openapi.json` vendor patch는 제거 대상이다.
> 근거: https://docs.langchain.com/langsmith/agent-server-changelog, https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse

LangGraph native Agent Server로 실행되는 chat graph 서비스입니다. 기존 `tracked_files`의 graph/model/tool/eval/RAG 코드는 `src/agent/**`로 이식했고, FastAPI 기반 LangGraph 호환 adapter는 제거했습니다.

## 실행

```bash
cp .env.example .env
uv sync
uv run langgraph dev --host 0.0.0.0 --port 2024 --no-browser
```

Docker compose에서는 프로젝트 루트에서 실행합니다.

```bash
docker compose up -d --build qdrant agent-service nginx
```

## graph id

`langgraph.json`의 graph id는 `chat`입니다.

```json
"graphs": {
  "chat": "./src/agent/services/chat/graph.py:chat_graph"
}
```

프론트의 `assistantId`도 `chat`으로 맞춰져 있습니다.

## JWT 경계

Agent Server custom auth는 Next.js BFF가 발급해 붙인 Better Auth RS256 JWT를 검증합니다.

```text
Browser cookie
  -> Next.js /api/proxy/agent
  -> /api/auth/token
  -> Authorization: Bearer <JWT>
  -> Nginx /api/agent
  -> Agent Server custom auth
```

필수 환경 변수:

```env
JWKS_URL=http://host.docker.internal:3000/api/auth/jwks
JWT_ISSUER=http://localhost:3000
JWT_AUDIENCE=frontend-api
JWT_ALGORITHM=RS256
```

## Custom routes

LangGraph native threads/runs API는 그대로 사용하고, 기존 UI가 필요로 하는 catalog만 custom route로 제공합니다.

```text
GET /api/v1/llm/models
GET /api/v1/llm/tools
```

Nginx/Next 경유 시 프론트에서는 다음 경로가 됩니다.

```text
GET /api/proxy/agent/api/v1/llm/models
GET /api/proxy/agent/api/v1/llm/tools
```

## 기존 adapter 제외

이식하지 않은 기존 adapter 경계:

```text
src/services/chat/langgraph_protocol/**
src/schemas/langgraph.py
src/api/endpoints/v1/langgraph.py
```

native Agent Server에서는 공식 `@langchain/react` `useStream`이 Protocol V2 `/stream/events` + `/commands` 계약을 직접 사용합니다.

## 장애 확인

자세한 적용/장애 확인 순서는 프로젝트 루트의 `docs/AGENT_SERVER_MIGRATION.md`를 보세요.
