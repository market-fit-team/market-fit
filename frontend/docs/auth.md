# auth

## `/api/auth/[...all]`

`src/app/api/auth/[...all]/route.ts`는 Better Auth handler를 Next.js App Router에 붙인다.

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

## `src/features/auth/lib/auth.ts`

`src/features/auth/lib/auth.ts`는 Better Auth server instance를 만든다.
authentik은 `genericOAuth` provider로 붙인다.
`nextCookies()`는 마지막에 둔다.

```ts
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.BETTER_AUTH_URL],
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "authentik",
          clientId: env.AUTHENTIK_CLIENT_ID,
          clientSecret: env.AUTHENTIK_CLIENT_SECRET,
          discoveryUrl: env.AUTHENTIK_DISCOVERY_URL,
          scopes: ["openid", "profile", "email", "user_profile"],
        },
      ],
    }),
    nextCookies(),
  ],
})
```

Better Auth의 `jwt()` plugin은 쓰지 않는다.
OIDC access token과 JWKS는 authentik이 제공한다.

```text
http://localhost:9000/application/o/pickle-web/
http://localhost:9000/application/o/pickle-web/jwks/
```

## `src/features/auth/lib/auth-client.ts`

`src/features/auth/lib/auth-client.ts`는 React client instance다.
클라이언트는 `genericOAuthClient()`만 붙인다.

```ts
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const { signOut, useSession, getSession } = authClient
```

로그인은 `signIn.oauth2`로 시작한다.

```ts
await authClient.signIn.oauth2({
  providerId: "authentik",
  callbackURL,
  errorCallbackURL,
  scopes: ["openid", "profile", "user_profile"],
})
```

## Server Session

Server Component에서는 Better Auth session을 직접 읽는다.
이 프로젝트는 `src/features/auth/lib/server-session.ts`로 얇게 감쌌다.
라이브러리 내장 `getServerSession` 헬퍼는 아니다.

```ts
export const getServerSession = async () => {
  return auth.api.getSession({
    headers: await headers(),
  })
}
```

직접 인라인할 때도 같은 패턴을 쓴다.

```ts
const session = await auth.api.getSession({
  headers: await headers(),
})
```

## Access Token

서버와 클라이언트 모두 Better Auth가 authentik provider access token을 꺼내는 창구다.
하지만 사용자 원본 정보는 Better Auth `session.user`가 아니라 authentik JWT와 authentik API 쪽을 본다.

서버는 `auth.api.getAccessToken(...)`를 쓴다.

```ts
const result = await auth.api.getAccessToken({
  body: {
    providerId: AUTHENTIK_PROVIDER_ID,
  },
  headers: await headers(),
})

const accessToken = result?.accessToken ?? null
```

클라이언트는 `authClient.getAccessToken(...)`를 쓴다.

```ts
const result = await authClient.getAccessToken({
  providerId: AUTHENTIK_PROVIDER_ID,
})

const accessToken = result.data?.accessToken ?? null
```

`src/features/auth/lib/server-access-token.ts`는 이 서버 호출을 감싼 보조 헬퍼다.
현재 구현의 핵심 흐름은 호출부에서 직접 `auth.api.getAccessToken(...)`를 쓰는 쪽이다.

## JWT

`src/app/example/playground/page.tsx`와 `src/app/example/playground/_components/playground-client.tsx`는 access token payload를 직접 파싱해서 authentik이 실제로 어떤 claim을 발급했는지 보여준다.

서버:

```ts
const accessTokenResult = await auth.api.getAccessToken({
  body: {
    providerId: AUTHENTIK_PROVIDER_ID,
  },
  headers: await headers(),
})

const accessToken = accessTokenResult?.accessToken ?? null
```

클라이언트:

```ts
const result = await authClient.getAccessToken({
  providerId: AUTHENTIK_PROVIDER_ID,
})

const accessToken = result.data?.accessToken ?? null
```

이 페이지는 세션, JWT 원문, JWT 파싱 결과, authentik `/core/users/me/` 응답을 서버/클라이언트에서 나란히 비교한다.

## Orval generated authentik API

`src/shared/api/generated/authentik-users`는 authentik OpenAPI에서 생성한 코드다.
이 프로젝트는 Better Auth `session.user`를 authentik 프로필 원본처럼 늘리지 않고, 필요하면 generated authentik API를 직접 호출한다.

`src/shared/api/generated/authentik-users/endpoints/core/core.ts`에는 `/core/users/me/`용 함수와 hook이 있다.

```ts
export const coreUsersMeRetrieve = async (
  options?: RequestInit
): Promise<SessionUser> => {
  return fetchWithAuth<SessionUser>(getCoreUsersMeRetrieveUrl(), {
    ...options,
    method: "GET",
  })
}
```

`src/shared/api/generated/authentik-users/schemas/session-user.ts`는 응답 타입을 제공한다.

```ts
export interface SessionUser {
  user: UserSelf
  original?: UserSelf
}
```

서버는 generated function을 직접 호출한다.

```ts
const authentikUser = await coreUsersMeRetrieve({
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  cache: "no-store",
})
```

클라이언트는 generated hook을 쓴다.

```ts
const authentikUserQuery = useCoreUsersMeRetrieve({
  query: {
    enabled: Boolean(accessToken),
    retry: false,
  },
  request: accessToken
    ? {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    : undefined,
})
```

이 방식이면 authentik 사용자 응답 타입을 프론트에서 다시 손으로 만들지 않는다.
`SessionUser`, `UserSelf` 같은 generated 타입을 그대로 쓴다.

## `src/features/auth/lib/fetch-with-auth.ts`

`src/features/auth/lib/fetch-with-auth.ts`는 Orval mutator다.
브라우저에서 Authorization header가 비어 있으면 Better Auth client API로 access token을 꺼내 붙인다.

```ts
const { data } = await authClient.getAccessToken({
  providerId: AUTHENTIK_PROVIDER_ID,
})

const accessToken = data?.accessToken

if (accessToken) {
  headers.set("authorization", `Bearer ${accessToken}`)
}
```

이 mutator는 일반 JSON API 호출용이다.
Orval generated community/profile/authentik-users endpoint들이 이 진입점을 공통으로 쓴다.

```text
Browser
  -> Traefik http://localhost:8088/api/{service}/...
  -> backend service
  -> authentik JWT 검증
```

SSE처럼 `Response`를 그대로 유지해야 하는 fetch는 이 mutator를 바로 쓰지 않는다.
그 경우 토큰 주입만 별도 fetch 구현에서 직접 처리한다.

## `/example/playground`

`src/app/example/playground/page.tsx`는 현재 인증 경계를 확인하는 데모 페이지다.
세션이 없으면 `/`로 리다이렉트한다.

```ts
const session = await getServerSession()

if (!session) {
  redirect("/")
}
```

이 페이지에서 보는 값:

```text
서버 세션
클라이언트 useSession
서버 JWT 원문 / 파싱 결과
클라이언트 JWT 원문 / 파싱 결과
서버 authentik /core/users/me/
클라이언트 authentik /core/users/me/
```

이 흐름은 Better Auth를 세션/토큰 브로커로 두고,
실제 사용자 정보는 authentik JWT와 generated authentik API에서 읽는 구조를 그대로 보여준다.

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
- `src/app/example/playground/page.tsx`
- `src/app/example/playground/_components/playground-client.tsx`
- `src/features/auth/lib/auth.ts`
- `src/features/auth/lib/auth-client.ts`
- `src/features/auth/lib/server-session.ts`
- `src/features/auth/lib/fetch-with-auth.ts`
- `src/shared/api/generated/authentik-users/endpoints/core/core.ts`
- `src/shared/api/generated/authentik-users/schemas/session-user.ts`
- `src/shared/db/schema.ts`

## 참고 문서

- https://www.better-auth.com/docs/integrations/next
- https://better-auth.com/docs/plugins/generic-oauth
- https://www.better-auth.com/docs/concepts/oauth
- https://www.better-auth.com/docs/concepts/api
- https://docs.goauthentik.io/add-secure-apps/providers/oauth2/
- https://docs.goauthentik.io/add-secure-apps/providers/property-mappings/
- https://api.goauthentik.io/reference/core-users-me-retrieve/

## authentik Google Identity Provider

Google OAuth credentials는 Better Auth에 직접 넣지 않는다.
repo root `.env`의 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`는 `docker compose`용으로만 둔다.

Google Cloud Console redirect URI:

```text
http://localhost:9000/source/oauth/callback/google/
```

Better Auth는 계속 `authentik` provider로만 붙는다.
Google login broker는 authentik이 맡는다.
