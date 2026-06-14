# chat

## `/api/agent`

클라이언트는 Agent Server 컨테이너를 직접 호출하지 않는다.
Traefik의 public path를 사용한다.

```text
Browser
  -> http://localhost:8088/api/agent
  -> Traefik router agent
  -> StripPrefix /api/agent
  -> agent-service:2024
```

`src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`는 절대 URL을 만든다.

```ts
const AGENT_PUBLIC_PATH = "/api/agent"
const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8088"

return new URL(AGENT_PUBLIC_PATH, origin).toString()
```

## authentik token

LangGraph stream fetch는 Better Auth session에서 authentik access token을 가져온다.

```ts
const result = await authClient.getAccessToken({
  providerId: "authentik",
})

headers.set("authorization", `Bearer ${accessToken}`)
```

Agent Server의 `src/agent/security/auth.py`가 authentik JWKS로 검증한다.

```text
JWKS_URL=http://authentik-server:9000/application/o/pickle-web/jwks/
JWT_ISSUER=http://localhost:9000/application/o/pickle-web/
JWT_AUDIENCE=pickle-web
```

## catalog

`src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`도 Traefik public path를 사용한다.

```text
GET http://localhost:8088/api/agent/api/v1/llm/models
GET http://localhost:8088/api/agent/api/v1/llm/tools
```

## 주요 파일

- `src/features/llm-chat/hooks/langgraph-chat-stream-provider.tsx`
- `src/features/llm-chat/lib/agent-catalog/use-agent-catalog.ts`
- `backend/services/agent-service/src/agent/security/auth.py`
- `../../docker-compose.yml`
