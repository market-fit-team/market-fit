# Security

`src/agent/security/auth.py`가 Keycloak access token를 검증한다.  
`src/agent/webapp.py`의 `HTTPBearer`는 OpenAPI 문서용이다.  
실제 인증은 LangGraph custom auth가 처리한다.

```py
bearer_auth = HTTPBearer(
    bearerFormat="JWT",
    scheme_name="bearerAuth",
    description="Keycloak access token를 Authorization: Bearer <token> 헤더로 전달합니다.",
    auto_error=False,
)
```

## `Authorization`

```py
def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise JwtAuthError("Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise JwtAuthError("Invalid Authorization header")

    return token
```

Bearer 스킴만 받는다.  
쿠키는 읽지 않는다.

```text
Browser cookie
  -> frontend/src/features/auth/lib/auth.ts
  -> Keycloak token endpoint
  -> backend/services/traefik/server.mjs
  -> Authorization: Bearer <JWT>
  -> src/agent/security/auth.py
```

프론트 쪽 JWT 경계는 `frontend/src/features/auth/lib/auth.ts`의 `jwt()` 플러그인과 `backend/services/traefik/server.mjs`의 헤더 교체로 닫힌다.

```ts
plugins: [
  jwt({
    jwks: {
      keyPairConfig: {
        alg: env.JWT_ALGORITHM,
        modulusLength: 2048,
      },
    },
    jwt: {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expirationTime: env.JWT_EXPIRATION,
      definePayload: ({ user }) => ({
        id: user.id,
        email: user.email,
        name: user.name,
      }),
    },
  }),
]
```

## JWKS

```py
JWKS_CACHE_TTL_SECONDS = 300
_jwks_cache: dict[str, Any] | None = None
_jwks_cache_expires_at = 0.0
_jwks_lock = asyncio.Lock()
```

```py
async def _fetch_jwks(*, force_refresh: bool = False) -> dict[str, Any]:
    now = time.monotonic()

    if not force_refresh and _jwks_cache is not None and now < _jwks_cache_expires_at:
        return _jwks_cache

    async with _jwks_lock:
        now = time.monotonic()
        if not force_refresh and _jwks_cache is not None and now < _jwks_cache_expires_at:
            return _jwks_cache

        async with httpx.AsyncClient(
            timeout=httpx.Timeout(5.0),
            headers={"accept": "application/json"},
        ) as client:
            response = await client.get(settings.jwks_url)
            response.raise_for_status()
            jwks = response.json()

        if not isinstance(jwks, dict) or not isinstance(jwks.get("keys"), list):
            raise JwtAuthError("Invalid JWKS response")

        _jwks_cache = jwks
        _jwks_cache_expires_at = now + JWKS_CACHE_TTL_SECONDS
        return jwks
```

`httpx.AsyncClient`를 쓴다.  
ASGI request path 안에서 sync client를 돌리지 않게 하기 위해서다.

```text
JWKS_URL=http://keycloak:8080/realms/pickle/protocol/openid-connect/certs
JWT_ISSUER=http://localhost:8180/realms/pickle
JWT_AUDIENCE=pickle-api
JWT_ALGORITHM=RS256
```

`src/agent/core/config.py`는 위 값을 기본값으로 읽는다.

```py
class Settings(BaseSettings):
    jwks_url: str = "http://keycloak:8080/realms/pickle/protocol/openid-connect/certs"
    jwt_issuer: str = "http://localhost:8180/realms/pickle"
    jwt_audience: str = "pickle-api"
    jwt_algorithm: str = "RS256"
```

`kid`를 찾지 못하면 캐시를 한 번 강제로 다시 읽는다.

```py
def _find_jwk_by_kid(jwks: dict[str, Any], kid: str | None) -> dict[str, Any]:
    if not kid:
        raise JwtAuthError("JWT header does not contain kid")

    for jwk in jwks.get("keys", []):
        if isinstance(jwk, dict) and jwk.get("kid") == kid:
            return jwk

    raise JwtAuthError("No matching JWK for kid")
```

## `kid` / `alg`

```py
header = jwt.get_unverified_header(token)
kid = header.get("kid")
alg = header.get("alg")

if alg != settings.jwt_algorithm:
    raise JwtAuthError(f"Unsupported JWT alg: {alg}")
```

헤더는 서명 검증 전에 읽는다.  
`alg`는 토큰에서 고르지 않고, 서버 allowlist인 `JWT_ALGORITHM`과 같을 때만 통과시킨다.

```py
return PyJWK.from_dict(jwk_dict, algorithm=settings.jwt_algorithm).key
```

`PyJWK.from_dict()`로 JWK를 키 객체로 바꾼다.  
그 키로만 `jwt.decode()`를 돌린다.

## `jwt.decode()`

```py
payload = jwt.decode(
    token,
    signing_key,
    algorithms=[settings.jwt_algorithm],
    audience=settings.jwt_audience,
    issuer=settings.jwt_issuer,
    options={"require": ["sub", "iss", "aud", "exp"]},
)
```

`iss`, `aud`, `exp`, `sub`를 모두 요구한다.  
`payload`는 dict여야 한다.

```py
subject = payload.get("sub")
if not isinstance(subject, str) or not subject:
    raise Auth.exceptions.HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
    )
```

## `identity`

```py
return {
    "identity": subject,
    "email": payload.get("email"),
    "name": payload.get("name"),
    "claims": payload,
}
```

`identity`가 LangGraph user context의 기준이 된다.  
`email`, `name`, `claims`는 같이 실려 간다.

## `401`

```py
@auth.authenticate
async def get_current_user(authorization: str | None) -> dict[str, Any]:
    try:
        token = _extract_bearer_token(authorization)
        payload = await _decode_token(token)
    except (JwtAuthError, InvalidTokenError, PyJWTError, httpx.HTTPError, ValueError) as exc:
        raise Auth.exceptions.HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
        ) from exc
```

JWKS fetch 실패, 토큰 파싱 실패, 서명 실패, `iss`/`aud` 불일치, 만료 토큰은 모두 401으로 모인다.

## `langgraph.json`

```json
{
  "$schema": "https://langgra.ph/schema.json",
  "python_version": "3.13",
  "dependencies": ["."],
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  },
  "env": ".env",
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
          "bearerFormat": "JWT",
          "description": "Keycloak access token를 Authorization: Bearer <token> 헤더로 전달합니다."
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  }
}
```

`enable_custom_route_auth: true`가 `src/agent/webapp.py`에 붙은 custom route에도 auth 검사를 적용한다.  
`openapi.securitySchemes`는 문서에만 반영된다.

## `langgraph.eval.json`

```json
{
  "$schema": "https://langgra.ph/schema.json",
  "python_version": "3.13",
  "dependencies": ["."],
  "graphs": {
    "chat": "./src/agent/services/chat/graph.py:chat_graph"
  },
  "env": ".env",
  "http": {
    "app": "./src/agent/webapp.py:app"
  }
}
```

eval 설정에는 `auth`가 없다.  
같은 `app`을 쓰지만 auth 경계는 다르다.

## `.env.example`

```text
JWKS_URL=http://keycloak:8080/realms/pickle/protocol/openid-connect/certs
JWT_ISSUER=http://localhost:8180/realms/pickle
JWT_AUDIENCE=pickle-api
JWT_ALGORITHM=RS256
```

`frontend/src/shared/config/env.ts`도 같은 계약을 지킨다.  
`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION`, `JWT_ALGORITHM`가 빠지면 프론트에서 바로 실패한다.

## 주요 파일

- `src/agent/security/auth.py`
- `src/agent/core/config.py`
- `src/agent/webapp.py`
- `src/agent/core/exception_handlers.py`
- `src/agent/core/exceptions.py`
- `src/agent/schemas/problem_detail.py`
- `langgraph.json`
- `langgraph.eval.json`
- `.env.example`

## 참고 문서

- LangGraph authentication and access control: https://docs.langchain.com/langsmith/auth
- LangGraph custom authentication: https://docs.langchain.com/langsmith/custom-auth
- LangGraph custom routes: https://docs.langchain.com/langsmith/custom-routes
- LangGraph OpenAPI security: https://docs.langchain.com/langsmith/openapi-security
- HTTPX async support: https://www.python-httpx.org/async/
- PyJWT API reference: https://pyjwt.readthedocs.io/en/stable/api.html
- PyJWT usage examples: https://pyjwt.readthedocs.io/en/latest/usage.html
- FastAPI Security Tools: https://fastapi.tiangolo.com/reference/security/
- FastAPI Dependencies and Security: https://fastapi.tiangolo.com/reference/dependencies/
- Better Auth Next.js integration: https://better-auth.com/docs/integrations/next
- Keycloak access token plugin: https://better-auth.com/docs/plugins/jwt
