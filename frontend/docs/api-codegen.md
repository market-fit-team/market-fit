# api-codegen

## `.orval/service-catalog.json`

`frontend/scripts/fetch-service-catalog.mjs`는 Discovery Server에서 Orval catalog를 가져온다.

```text
GET http://localhost:8090/catalog/orval
-> .orval/service-catalog.json
```

응답 shape는 서비스마다 같다.

```json
{
  "services": [
    {
      "name": "community",
      "openapiUrl": "http://localhost:8090/openapi/community",
      "publicPath": "/api/community",
      "schemasType": "zod",
      "tags": ["api", "public", "orval", "spring"]
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

OpenAPI input은 Discovery Server가 proxy한다.

```text
input.target = service.openapiUrl
```

런타임 base URL은 API Edge를 본다.

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

브라우저 요청은 Keycloak access token을 Authorization header로 붙인다.
Server Component prefetch는 `server-access-token.ts`에서 받은 token을 `fetch.headers.Authorization`으로 직접 넘긴다.

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
- `src/features/auth/lib/fetch-with-auth.ts`

## 참고 문서

- https://orval.dev/docs/reference/configuration/input
- https://orval.dev/docs/guides/fetch
- https://orval.dev/docs/guides/custom-client
