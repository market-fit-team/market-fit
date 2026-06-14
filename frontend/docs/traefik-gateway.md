# traefik-gateway

## `traefik`

`docker-compose.yml`의 `traefik` service가 브라우저 런타임 API 요청을 받는다.

```yaml
traefik:
  image: traefik:v3.0
  command:
    - --entrypoints.web.address=:8088
    - --providers.docker=true
    - --providers.docker.exposedbydefault=false
  ports:
    - "8088:8088"
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

Traefik Docker provider는 container label에서 router, service, middleware 설정을 읽는다.

```text
Browser
-> http://localhost:8088/api/community/api/v1/posts
-> Traefik router community
-> StripPrefix /api/community
-> community-service:8080/api/v1/posts
```

## `traefik.http.routers.*`

`community-service`는 `/api/community` prefix를 가진 요청을 받는다.

```yaml
community-service:
  labels:
    - traefik.enable=true
    - traefik.http.routers.community.rule=PathPrefix(`/api/community`)
    - traefik.http.routers.community.entrypoints=web
    - traefik.http.routers.community.middlewares=community-strip,api-cors
    - traefik.http.middlewares.community-strip.stripprefix.prefixes=/api/community
    - traefik.http.services.community.loadbalancer.server.port=8080
```

같은 규칙을 `profile`, `echo`, `agent`에 둔다.

```text
/api/profile -> profile-service:3001
/api/echo -> echo-service:3002
/api/agent -> agent-service:2024
/api/community -> community-service:8080
```

## `*-cors`

각 API service label에 CORS middleware를 둔다.

```yaml
community-service:
  labels:
    - traefik.http.routers.community.middlewares=community-strip,community-cors
    - traefik.http.middlewares.community-cors.headers.accesscontrolalloworiginlist=http://localhost:3000,http://127.0.0.1:3000
    - traefik.http.middlewares.community-cors.headers.accesscontrolallowmethods=GET,POST,PUT,PATCH,DELETE,OPTIONS
    - traefik.http.middlewares.community-cors.headers.accesscontrolallowheaders=Authorization,Content-Type,X-CSRF-Token
```

`profile`, `echo`, `agent`도 같은 패턴으로 `{service}-cors` middleware를 둔다.

## `app.api.*`

Traefik 라벨과 같은 service label에 Orval metadata를 둔다.

```yaml
community-service:
  labels:
    - app.api.enabled=true
    - app.api.name=community
    - app.api.publicPath=/api/community
    - app.api.openapiPath=/v3/api-docs
    - app.api.schemasType=zod
```

`frontend/scripts/fetch-service-catalog.mjs`는 `app.api.*` label만 읽는다. Traefik label은 런타임 라우팅에만 사용한다.

## 주요 파일

- `docker-compose.yml`
- `frontend/scripts/fetch-service-catalog.mjs`
- `frontend/orval.config.ts`
- `frontend/src/features/auth/lib/fetch-with-auth.ts`

## 참고 문서

- https://doc.traefik.io/traefik/providers/docker/
- https://doc.traefik.io/traefik/routing/routers/
- https://doc.traefik.io/traefik/middlewares/http/stripprefix/
- https://doc.traefik.io/traefik/middlewares/http/headers/
