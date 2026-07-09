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
-> http://localhost:8088/api/profile/user-profile
-> Traefik router profile
-> StripPrefix /api/profile
-> profile-service:3001/user-profile
```

## `traefik.http.routers.*`

`profile-service`는 `/api/profile` prefix를 가진 요청을 받는다.

```yaml
profile-service:
  labels:
    - traefik.enable=true
    - traefik.http.routers.profile.rule=PathPrefix(`/api/profile`)
    - traefik.http.routers.profile.entrypoints=web
    - traefik.http.routers.profile.middlewares=profile-strip,api-cors
    - traefik.http.middlewares.profile-strip.stripprefix.prefixes=/api/profile
    - traefik.http.services.profile.loadbalancer.server.port=3001
```

같은 규칙을 `market`, `post`, `agent`에도 둔다.

```text
/api/profile -> profile-service:3001
/api/market -> market-service:8080
/api/agent -> agent-service:2024
/api/post -> post-service:8080
```

## `*-cors`

각 API service label에 CORS middleware를 둔다.

```yaml
profile-service:
  labels:
    - traefik.http.routers.profile.middlewares=profile-strip,api-cors
```

`market`, `post`, `agent`도 같은 패턴으로 middleware를 둔다.

## `app.api.*`

Traefik 라벨과 같은 service label에 Orval metadata를 둔다.

```yaml
profile-service:
  labels:
    - app.api.enabled=true
    - app.api.name=profile
    - app.api.publicPath=/api/profile
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
