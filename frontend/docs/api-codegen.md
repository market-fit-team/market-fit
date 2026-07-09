# api-codegen

## `.orval/service-catalog.json`

`frontend/scripts/fetch-service-catalog.mjs`는 `docker compose config --format json`을 실행한다.

```text
frontend/scripts/fetch-service-catalog.mjs
-> docker compose config --format json
-> services.*.labels
-> app.api.* labels
-> .orval/service-catalog.json
```

서비스별 Orval metadata는 `docker-compose.yml`의 label에 둔다.

```yaml
profile-service:
  labels:
    - app.api.enabled=true
    - app.api.name=profile
    - app.api.publicPath=/api/profile
    - app.api.openapiPath=/v3/api-docs
    - app.api.schemasType=zod
```

생성되는 catalog shape는 서비스마다 같다.

```json
{
  "services": [
    {
      "name": "profile",
      "openapiUrl": "http://localhost:8088/api/profile/v3/api-docs",
      "publicPath": "/api/profile",
      "openapiPath": "/v3/api-docs",
      "schemasType": "zod",
      "composeService": "profile-service"
    }
  ]
}
```

## `orval.config.ts`

`frontend/orval.config.ts`는 서비스명을 하드코딩하지 않는다.

```ts
const catalog = readCatalog()

return Object.fromEntries(
  catalog.services.map((service) => [
    `${service.name}-api`,
    createProject(service),
  ])
)
```

OpenAPI input은 Traefik public path를 사용한다.

```text
input.target = http://localhost:8088/api/profile/v3/api-docs
```

런타임 base URL도 같은 public path를 사용한다.

```ts
baseUrl: {
  runtime: `(process.env.NEXT_PUBLIC_API_ORIGIN ?? "") + "${service.publicPath}"`,
}
```

## mutator

Generated client는 `src/features/auth/lib/fetch-with-auth.ts`를 사용한다.

```ts
override: {
  mutator: {
    path: "./src/features/auth/lib/fetch-with-auth.ts",
    name: "fetchWithAuth",
  },
}
```

`fetchWithAuth`는 브라우저에서 authentik access token을 가져와 `Authorization` header를 붙인다.

```text
Browser
-> http://localhost:8088/api/profile/...
-> Traefik
-> profile-service
```

## npm scripts

```json
{
  "api:catalog": "node scripts/fetch-service-catalog.mjs",
  "api:gen": "npm run api:catalog && npm run api:gen:only",
  "api:gen:only": "orval"
}
```

## 주요 파일

- `orval.config.ts`
- `scripts/fetch-service-catalog.mjs`
- `.orval/service-catalog.example.json`
- `../docker-compose.yml`
- `src/features/auth/lib/fetch-with-auth.ts`

## 참고 문서

- https://docs.docker.com/reference/cli/docker/compose/config/
- https://doc.traefik.io/traefik/providers/docker/
- https://orval.dev/docs/reference/configuration/input
- https://orval.dev/docs/guides/custom-client
