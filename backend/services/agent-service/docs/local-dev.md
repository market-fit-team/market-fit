# Local Dev

`backend/services/agent-service/.env.example`를 복사해 `.env`를 만든다.  
`src/agent/core/config.py`는 `.env`를 읽고, `docker-compose.yml`의 `agent-service`도 같은 파일을 `env_file`로 넣는다.

## .env.example

```env
LANGGRAPH_CLI_NO_ANALYTICS=1
LANGSMITH_TRACING=false

JWKS_URL=http://host.docker.internal:3000/api/auth/jwks
JWT_ISSUER=http://localhost:3000
JWT_AUDIENCE=frontend-api
JWT_ALGORITHM=RS256

OLLAMA_API_KEY=
OLLAMA_BASE_URL=https://ollama.com
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENCODE_ZEN_API_KEY=
OPENCODE_ZEN_BASE_URL=https://opencode.ai/zen/v1
GEMINI_API_KEY=
```

JWT가 있는 기본 설정은 `langgraph.json`을 탄다.  
eval용 `langgraph.eval.json`은 `auth`가 없어서 JWT가 빠진다.

## uv sync

`Makefile`의 실제 target은 다음과 같다.

```make
install:
	uv sync --no-dev

dev:
	uv sync

run:
	uv run langgraph dev
```

개발 의존성까지 맞출 때는 `make dev`를 쓴다.  
런타임만 맞출 때는 `make install`이다.

## langgraph dev

기본 서버는 `langgraph.json`을 읽는다.

```text
uv run langgraph dev
```

eval 서버는 별도 config를 넘긴다.

```text
FF_V2_EVENT_STREAMING=true uv run langgraph dev \
  --config langgraph.eval.json \
  --no-browser
```

`langgraph.eval.json`에는 `auth`가 없어서 `Authorization: Bearer <JWT>`를 요구하지 않는다.  
같은 `src/agent/webapp.py`를 쓰지만, 그 안의 `HTTPBearer`는 OpenAPI 문서용이다.

## JWT

기본 설정에서는 프론트가 발급한 JWT가 필요하다.

```text
JWKS_URL=http://host.docker.internal:3000/api/auth/jwks
JWT_ISSUER=http://localhost:3000
JWT_AUDIENCE=frontend-api
JWT_ALGORITHM=RS256
```

`src/agent/security/auth.py`는 `sub`, `iss`, `aud`, `exp`를 고정 검증한다.  
`docker-compose.yml`의 `agent-service`도 같은 값을 환경변수로 주입한다.

eval 설정은 JWT 없이 돈다.

```text
langgraph dev --config langgraph.eval.json
```

## docker-compose.yml

루트 compose에서 `agent-service`는 이렇게 올라간다.

```yaml
agent-service:
  build: ./backend/services/agent-service
  container_name: agent-service
  env_file:
    - ./backend/services/agent-service/.env
  environment:
    - LANGGRAPH_CLI_NO_ANALYTICS=1
    - FF_V2_EVENT_STREAMING=true
    - JWKS_URL=http://host.docker.internal:3000/api/auth/jwks
    - JWT_ISSUER=http://localhost:3000
    - JWT_AUDIENCE=frontend-api
    - JWT_ALGORITHM=RS256
  extra_hosts:
    - "host.docker.internal=host-gateway"
  expose:
    - "2024"
```

`FF_V2_EVENT_STREAMING=true`가 있어야 `/stream/events`와 `/commands`의 Protocol V2 스트림을 본다.  
`nginx`는 루트에서 `8080:80`으로 열리고, `host.docker.internal`을 내부 호스트로 돌린다.

실행은 루트에서 이 명령을 쓴다.

```text
docker compose up -d --build agent-service nginx
```

## 주요 파일

- `.env.example`
- `Makefile`
- `Dockerfile`
- `langgraph.json`
- `langgraph.eval.json`
- `src/agent/core/config.py`
- `src/agent/security/auth.py`
- `src/agent/webapp.py`
- `docker-compose.yml`
- `evals/config.yaml`

## 참고 문서

- LangGraph CLI: https://docs.langchain.com/langsmith/cli
- LangGraph local development & testing: https://docs.langchain.com/langsmith/local-dev-testing
- LangSmith Agent Server: https://docs.langchain.com/langsmith/agent-server
- Agent Server Protocol V2 event stream SSE: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
- Agent Server Protocol V2 command: https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
- Better Auth Next.js integration: https://www.better-auth.com/docs/integrations/next
- Better Auth JWT plugin: https://better-auth.com/docs/plugins/jwt
