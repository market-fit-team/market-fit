# chat

## `/api/agent`

클라이언트는 Agent Server 컨테이너를 직접 호출하지 않는다.
API Edge의 public path를 사용한다.

```text
Browser
  -> http://localhost:8088/api/agent
  -> api-edge
  -> discovery-service /resolve/agent
  -> agent-service:2024
```

`src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`는 절대 URL을 만든다.

```ts
const AGENT_PUBLIC_PATH = "/api/agent"
const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8088"

return new URL(AGENT_PUBLIC_PATH, origin).toString()
```

## Keycloak token

LangGraph stream fetch는 Better Auth session에서 Keycloak access token을 가져온다.

```ts
const result = await authClient.getAccessToken({
  providerId: "keycloak",
})

headers.set("authorization", `Bearer ${accessToken}`)
```

Agent Server의 `src/agent/security/auth.py`가 Keycloak JWKS로 검증한다.

```text
JWKS_URL=http://keycloak:8080/realms/pickle/protocol/openid-connect/certs
JWT_ISSUER=http://localhost:8180/realms/pickle
JWT_AUDIENCE=pickle-api
```

## catalog

`src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`도 API Edge를 사용한다.

```text
GET http://localhost:8088/api/agent/api/v1/llm/models
GET http://localhost:8088/api/agent/api/v1/llm/tools
```

## 주요 파일

- `src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`
- `src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`
- `backend/services/agent-service/src/agent/security/auth.py`
- `backend/services/api-edge/server.mjs`
