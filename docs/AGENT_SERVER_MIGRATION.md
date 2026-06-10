# LangGraph Agent Server 이식 패치 적용 가이드

이 zip은 전체 프로젝트가 아니라 **수정/추가 파일만** 담은 패치입니다. 기존 프로젝트 루트에 덮어쓰는 방식으로 적용하세요.

## 0. 적용 전 삭제 권장 파일

아래 파일은 기존 simple agent template의 잔여물입니다. zip overlay만으로는 삭제되지 않으므로 먼저 제거하는 편이 안전합니다.

```bash
rm -rf backend/services/agent-service/src/simple_agent
rm -f backend/services/agent-service/uv.lock
```

`tests/`는 이 패치 안에 새 테스트 파일이 같은 경로로 포함되어 있으므로 덮어써집니다.

## 1. 패치 적용

프로젝트 루트에서 실행합니다.

```bash
unzip pickle-agent-server-patch.zip -d .
```

또는 zip을 풀어 나온 파일을 그대로 프로젝트 루트에 복사합니다.

## 2. .env 구성

### frontend

`frontend/.env.example`에 Agent Server 관련 값이 추가되어 있습니다.

```env
NEXT_PUBLIC_AGENT_PROXY_BASE_URL="/api/proxy/agent"
AGENT_ASSISTANT_ID="chat"
```

현재 프론트 런타임은 직접 env를 읽지 않고 `/api/proxy/agent` 상수를 사용합니다. 위 값은 운영 전환 시 기준값을 문서화하기 위한 것입니다.

### backend/services/agent-service

```bash
cd backend/services/agent-service
cp .env.example .env
```

필수 확인값은 다음입니다.

```env
JWKS_URL=http://host.docker.internal:3000/api/auth/jwks
JWT_ISSUER=http://localhost:3000
JWT_AUDIENCE=frontend-api
JWT_ALGORITHM=RS256
```

이 값들은 frontend의 Better Auth JWT 설정과 맞아야 합니다.

## 3. Docker / Nginx 연동 구조

추가된 흐름은 다음입니다.

```text
Browser
  -> Next.js /api/proxy/agent/**
  -> Better Auth JWT 발급/Authorization 재작성
  -> Nginx /api/agent/**
  -> agent-service:2024
  -> LangGraph native Agent Server
```

`docker-compose.yml`에는 다음이 추가됩니다.

- `agent-service`
- `qdrant`
- `nginx.depends_on`의 `agent-service`
- `qdrant_data` volume

`backend/nginx/nginx.conf`에는 다음이 추가됩니다.

- `upstream agent_upstream`
- `location /api/agent/`
- LangGraph SSE streaming을 위한 `proxy_buffering off`, 긴 timeout

## 4. Frontend 이식 구조

추가된 핵심 경로입니다.

```text
frontend/src/app/chat/page.tsx
frontend/src/features/llm-chat/**
frontend/src/shared/api/csrf.ts
frontend/src/shared/utils/**
```

중요한 점은 `frontend/src/app/chat/page.tsx`에서 기존 `ClientOnly`를 사용한다는 것입니다.

```tsx
<ClientOnly fallback={<ChatPageSkeleton />}>
  <ChatPage />
</ClientOnly>
```

LangGraph SDK는 브라우저 런타임 의존성이 있고 초기 stream state가 서버/클라이언트에서 다를 수 있으므로, 이 경계를 client-only로 감싸 hydration mismatch 가능성을 줄입니다.

## 5. Generated / Orval 처리

이 패치는 generated 파일을 포함하지 않습니다.

`frontend/orval.config.ts`에는 agent-api가 추가되어 있습니다.

```ts
"agent-api": createProject({
  name: "agent",
  inputPath: "/api/agent/openapi.json",
  runtimeBasePath: "/api/proxy/agent",
})
```

다만 현재 chat UI는 generated agent client에 직접 의존하지 않습니다. 모델/툴 catalog는 아래 custom route를 직접 fetch합니다.

```text
GET /api/proxy/agent/api/v1/llm/models
GET /api/proxy/agent/api/v1/llm/tools
```

따라서 초기 이식은 generated 없이도 가능합니다. 이후 generated를 쓰고 싶으면 다음 순서로 확인하세요.

```bash
docker compose up -d --build agent-service nginx
cd frontend
npm run api:gen
```

## 6. Agent Server 구조

기존 template의 `simple_agent` 대신 다음 구조를 사용합니다.

```text
backend/services/agent-service/src/agent/
  clients/
  core/
  repositories/
  schemas/
  security/auth.py
  services/chat/
  services/rag/
  webapp.py
```

`langgraph.json`의 graph id는 프론트와 맞추기 위해 `chat`입니다.

```json
"graphs": {
  "chat": "./src/agent/services/chat/graph.py:chat_graph"
}
```

프론트의 `assistantId`도 `chat`입니다.

## 7. 기존 adapter 제거 경계

기존 `tracked_files`의 FastAPI 호환 adapter 계층은 이식하지 않았습니다.

제외한 대표 경로:

```text
src/services/chat/langgraph_protocol/**
src/schemas/langgraph.py
src/api/endpoints/v1/langgraph.py
```

대신 프론트는 LangGraph SDK의 native `useStream`으로 Agent Server에 붙습니다.

```ts
apiUrl: "/api/proxy/agent"
assistantId: "chat"
```

그리고 기존 adapter가 해주던 `context -> state` 복사는 `buildSubmitInput()`에서 처리합니다.

```ts
{
  messages: [...],
  model,
  reasoning_effort,
  allowed_tools,
  interrupt_on,
}
```

## 8. 실행 순서

```bash
# 1. frontend env 준비
cp frontend/.env.example frontend/.env

# 2. agent env 준비
cp backend/services/agent-service/.env.example backend/services/agent-service/.env

# 3. 기존 agent-service lock/template 잔여물 제거
rm -rf backend/services/agent-service/src/simple_agent
rm -f backend/services/agent-service/uv.lock

# 4. compose build
make dev
```

수동으로 나누어 실행한다면:

```bash
docker compose up -d --build qdrant agent-service nginx
cd frontend
npm install
npm run dev
```

## 9. 빠른 장애 확인 순서

### A. Agent Server가 안 뜰 때

```bash
docker compose logs -f agent-service
```

우선 확인:

1. `backend/services/agent-service/.env` 존재 여부
2. provider API key 설정 여부
3. `uv.lock`이 기존 template 상태로 남아 있지 않은지
4. `langgraph.json`의 graph path가 `./src/agent/services/chat/graph.py:chat_graph`인지

### B. 프론트에서 404가 날 때

```bash
curl http://localhost:8080/api/agent/docs
curl http://localhost:8080/api/agent/openapi.json
```

안 되면 Nginx 라우팅 문제입니다.

확인:

1. `nginx.depends_on`에 `agent-service`가 있는지
2. `upstream agent_upstream`이 있는지
3. `location /api/agent/`의 `proxy_pass http://agent_upstream/;`가 prefix를 제거하는지

### C. 401이 날 때

Agent Server custom auth가 Better Auth JWT를 검증합니다.

확인 순서:

1. 브라우저가 로그인 상태인지
2. `/api/auth/token`이 JWT를 발급하는지
3. JWT header `alg`가 `RS256`인지
4. `JWKS_URL`이 agent-service 컨테이너에서 접근 가능한지
5. `JWT_ISSUER`, `JWT_AUDIENCE`가 frontend와 같은지
6. Next proxy가 client Authorization을 삭제하고 BFF JWT로 재설정하는지

### D. 모델/툴 목록이 안 뜰 때

```bash
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8080/api/agent/api/v1/llm/models

curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8080/api/agent/api/v1/llm/tools
```

브라우저에서는 직접 token을 넣지 않습니다. 프론트는 `/api/proxy/agent/...`로 호출하고 Next BFF가 JWT를 붙입니다.

### E. 스트리밍이 한꺼번에 몰려올 때

Nginx streaming 설정 문제일 가능성이 큽니다.

확인:

```nginx
proxy_buffering off;
proxy_cache off;
proxy_read_timeout 3600s;
```

Next proxy는 upstream response body를 `new Response(upstreamRes.body, ...)`로 그대로 반환해야 합니다.

### F. Hydration mismatch가 날 때

`frontend/src/app/chat/page.tsx`가 `ClientOnly`로 `ChatPage`를 감싸고 있는지 확인합니다.

이 경계가 빠지면 LangGraph SDK의 초기 browser-only state 때문에 App Router hydration 시점이 흔들릴 수 있습니다.

## 10. 추천 적용 단위

처음에는 아래만 확인하면 됩니다.

```text
[ ] docker compose build agent-service 성공
[ ] http://localhost:8080/api/agent/docs 접근
[ ] 로그인 상태에서 /chat 진입
[ ] 모델/툴 catalog 응답
[ ] 첫 메시지 stream 출력
[ ] HITL tool interrupt/resume 동작
```

대부분의 경우 `Nginx /api/agent`, `Next /api/proxy/agent`, `JWT issuer/audience`, `ClientOnly` 네 지점만 맞으면 초기 연동은 빠르게 붙습니다.
