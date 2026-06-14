# Agent Service

`langgraph.json`의 `chat` graph가 이 서비스의 기본 진입점이다.  
`src/agent/webapp.py`는 native Agent Server 위에 `/api/v1/llm/models`와 `/api/v1/llm/tools`를 붙인다.  
`src/agent/security/auth.py`는 authentik access token를 검증한다.  
`evals/`는 Protocol V2 HTTP/SSE 평가 하네스를 둔다.

## langgraph.json

```json
{
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  },
  "http": {
    "app": "./src/agent/webapp.py:app",
    "enable_custom_route_auth": true
  },
  "auth": {
    "path": "src/agent/security/auth.py:auth",
    "openapi": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        }
      }
    }
  }
}
```

`chat` graph가 기본 Agent Server graph id다.  
`http.app`가 custom routes를 붙이고, `auth.path`가 JWT 검증기를 연결한다.

## /api/v1/llm/models

```ts
@app.get("/api/v1/llm/models", response_model=ListChatModelsResponse, tags=["llm"])
async def list_llm_models(_: DocumentedBearerAuth) -> ListChatModelsResponse:
    return await list_chat_models()
```

응답 shape는 `ListChatModelsResponse`다.

```ts
{
  object: "list",
  data: [
    {
      id: "gpt-oss:120b",
      object: "model",
      created: 0,
      supported_reasoning_efforts: ["none", "low", "medium", "high"]
    }
  ]
}
```

모델 목록은 `src/agent/services/chat/model_cards.py`의 내부 카드에서 온다.

## /api/v1/llm/tools

```ts
@app.get("/api/v1/llm/tools", response_model=ListChatToolsResponse, tags=["llm"])
async def list_llm_tools(_: DocumentedBearerAuth) -> ListChatToolsResponse:
    return ListChatToolsResponse(tools=list_chat_tools())
```

`list_chat_tools()`가 돌려주는 shape는 다음과 같다.

```ts
{
  tools: [
    {
      name: "add",
      description: "두 숫자를 더합니다.",
      category: "calculator",
      default_allowed: true,
      allowed_decisions: ["approve", "edit", "reject", "respond"]
    }
  ]
}
```

계산기 tool 네 개가 등록되어 있다.

```text
add
subtract
multiply
divide
```

## JWT

브라우저 쿠키는 이 서비스가 읽지 않는다.  
`Authorization: Bearer <JWT>`만 본다.  
`src/agent/security/auth.py`는 `JWKS_URL`로 JWKS를 가져와 `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ALGORITHM`을 고정 검증한다.

```env
JWKS_URL=http://authentik-server:9000/application/o/pickle-web/jwks/
JWT_ISSUER=http://localhost:9000/application/o/pickle-web/
JWT_AUDIENCE=pickle-web
JWT_ALGORITHM=RS256
```

검증이 성공하면 사용자 컨텍스트는 이런 shape로 graph에 들어간다.

```ts
{
  identity: payload.sub,
  email: payload.email,
  name: payload.name,
  claims: payload,
}
```

## evals

`langgraph.eval.json`은 같은 `chat` graph와 `src/agent/webapp.py`만 쓰고, `auth` 블록이 없다.  
`evals/config.yaml`은 `http://localhost:2024`의 Agent Server에 붙는다.

```yaml
runners:
  - name: local-agent-server
    type: http_sse
    base_url: http://localhost:2024
```

평가 실행은 네이티브 `/threads`, `/threads/{thread_id}/stream/events`, `/threads/{thread_id}/commands`를 직접 호출한다.

```text
uv run langgraph dev --config langgraph.eval.json --no-browser
uv run python -m evals.agent_eval --config evals/config.yaml
```

`evals/scenarios/*.yaml`는 prompt, allowed_tools, interrupt_on, resume, validate를 담는다.

## 문서

- `docs/README.md`
- `docs/architecture.md`
- `docs/local-dev.md`

## 주요 파일

- `langgraph.json`
- `langgraph.eval.json`
- `src/agent/webapp.py`
- `src/agent/security/auth.py`
- `src/agent/services/chat/graph.py`
- `src/agent/services/chat/model_cards.py`
- `src/agent/services/chat/toolkits/chat_toolkit.py`
- `evals/config.yaml`
- `evals/agent_eval/runner.py`
- `evals/scenarios/calculator-add-tool.yaml`
- `evals/scenarios/calculator-divide-hitl.yaml`

## 참고 문서

- LangGraph CLI: https://docs.langchain.com/langsmith/cli
- LangGraph local development & testing: https://docs.langchain.com/langsmith/local-dev-testing
- LangSmith Agent Server: https://docs.langchain.com/langsmith/agent-server
- LangSmith custom routes: https://docs.langchain.com/langsmith/custom-routes
- Agent Server Protocol V2 event stream SSE: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- Agent Server Protocol V2 command: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- Better Auth Next.js integration: https://www.better-auth.com/docs/integrations/next
- Better Auth Generic OAuth: https://better-auth.com/docs/plugins/generic-oauth
