# auth

## `/api/auth/[...all]`

`src/app/api/auth/[...all]/route.ts`는 Better Auth handler를 Next.js에 붙인다.

```ts
const handler = toNextJsHandler(auth)

export const GET = (req: NextRequest) => handler.GET(req)
export const POST = (req: NextRequest) => handler.POST(req)
```

이 route는 gateway가 아니다. authentik OAuth callback과 Better Auth session cookie만 처리한다.

```text
Browser
  -> /api/auth/sign-in/oauth2
  -> authentik
  -> /api/auth/oauth2/callback/authentik
  -> Better Auth session cookie
```

## authentik provider

`src/features/auth/lib/auth.ts`는 Better Auth `genericOAuth` 설정 객체로 authentik OIDC provider를 붙인다.

```ts
plugins: [
  genericOAuth({
    config: [
      {
        providerId: "authentik",
        clientId: env.AUTHENTIK_CLIENT_ID,
        clientSecret: env.AUTHENTIK_CLIENT_SECRET,
        discoveryUrl: env.AUTHENTIK_DISCOVERY_URL,
        scopes: ["openid", "profile", "email"],
      },
    ],
  }),
  nextCookies(),
]
```

Better Auth의 `jwt()` plugin은 없다.

```text
/api/auth/token ❌
/api/auth/jwks  ❌
```

authentik이 access token과 JWKS를 제공한다.

```text
http://localhost:9000/application/o/pickle-web/
http://localhost:9000/application/o/pickle-web/jwks/
```

## Server Component

`src/features/auth/lib/server-session.ts`는 Server Component에서 Better Auth session을 읽는다.

```ts
export const getServerSession = async () => {
  return auth.api.getSession({
    headers: await headers(),
  })
}
```

`src/features/auth/lib/server-access-token.ts`는 같은 session cookie로 authentik provider access token을 가져온다.

```ts
export const getServerOidcAccessToken = async () => {
  const result = await auth.api.getAccessToken({
    body: { providerId: "authentik" },
    headers: await headers(),
  })

  return result?.accessToken ?? result?.data?.accessToken ?? null
}
```

## Client Component

`src/features/auth/lib/auth-client.ts`는 `genericOAuthClient()`만 붙인다.

```ts
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})
```

로그인은 `signIn.oauth2`로 시작한다.

```ts
await authClient.signIn.oauth2({
  providerId: "authentik",
  callbackURL,
  errorCallbackURL: "/sign-in?error=oauth",
  scopes: ["openid", "profile", "email"],
})
```

## API token

`src/features/auth/lib/fetch-with-auth.ts`는 Orval mutator다.

```ts
const result = await authClient.getAccessToken({
  providerId: "authentik",
})
```

브라우저에서 Authorization header가 없으면 authentik access token을 붙인다.

```text
Browser
  -> Traefik http://localhost:8088/api/{service}/...
  -> backend service
  -> authentik JWT 검증
```

## Drizzle 테이블

`src/shared/db/schema.ts`는 Better Auth core table만 둔다.

```text
user
account
session
verification
```

`jwks` 테이블은 `frontend/drizzle/0001_drop_better_auth_jwks.sql`에서 삭제한다.

## 주요 파일

- `src/app/api/auth/[...all]/route.ts`
- `src/features/auth/lib/auth.ts`
- `src/features/auth/lib/auth-client.ts`
- `src/features/auth/lib/server-session.ts`
- `src/features/auth/lib/server-access-token.ts`
- `src/features/auth/lib/fetch-with-auth.ts`
- `src/shared/db/schema.ts`

## 참고 문서

- https://better-auth.com/docs/integrations/next
- https://better-auth.com/docs/plugins/generic-oauth
- https://better-auth.com/docs/concepts/oauth
- https://www.authentik.org/securing-apps/oidc-layers


## authentik Google Identity Provider

Google OAuth credentials are now registered in authentik, not directly in Better Auth. Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` only in the repo root `.env` for `docker compose`.

Google Cloud Console redirect URI:

```text
http://localhost:9000/source/oauth/callback/google/
```

Better Auth still talks to authentik using the `authentik` provider. authentik then brokers Google login.
