# api-edge

## `/api/{service}/...`

`backend/services/api-edge/server.mjs`가 브라우저 런타임 트래픽을 받는다.

```text
GET http://localhost:8088/api/community/api/v1/posts
```

경로는 service name과 upstream path로 나뉜다.

```text
/api/community/api/v1/posts
-> serviceName: community
-> upstreamPath: api/v1/posts
```

API Edge는 Discovery Server에 service resolve를 요청한다.

```text
GET http://discovery-service:8090/resolve/community
```

응답의 `baseUrl`로 upstream 요청을 만든다.

```text
http://community-service:8080/api/v1/posts
```

## CORS

`ALLOWED_ORIGINS`로 허용할 Next.js origin을 정한다.

```yaml
api-edge:
  environment:
    ALLOWED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000"
```

Preflight는 API Edge가 204로 끝낸다.

## Authorization

API Edge는 Authorization header를 그대로 전달한다.

```text
Browser Authorization: Bearer <keycloak-access-token>
-> API Edge
-> backend service
```

JWT issuer/JWKS/audience 검증은 backend service가 수행한다.

## streaming

Agent service는 `sse` tag를 가진다.

```json
{
  "name": "agent",
  "tags": ["api", "public", "orval", "python", "sse"]
}
```

API Edge는 upstream response body를 stream으로 pipe한다.

```js
Readable.fromWeb(upstream.body).pipe(res)
```

## 주요 파일

- `backend/services/api-edge/server.mjs`
- `backend/services/api-edge/Dockerfile`
- `backend/consul/config/services.json`

## 참고 문서

- https://developer.hashicorp.com/consul/api-docs/health
- https://developer.hashicorp.com/consul/api-docs/catalog
