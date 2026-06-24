# auth

## Session User

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

세션 `user`는 기본 Better Auth user shape를 그대로 쓰지 않는다.

```ts
type SessionUser = {
  uuid: string
  displayName: string
  age?: number | null
  job?: string | null
  avatarSeed: string
}
```

서버에서는 `getServerSession()`으로 같은 shape를 읽는다.

```ts
const session = await getServerSession()

if (!session) {
  redirect("/login")
}

session.user.uuid
session.user.displayName
session.user.age
session.user.job
session.user.avatarSeed
```

클라이언트에서는 `useSession()`으로 같은 shape를 읽는다.

```ts
const { data: session } = useSession()

session?.user.uuid
session?.user.displayName
session?.user.age
session?.user.job
session?.user.avatarSeed
```

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
OAuth 로그인 시 access token JWT의 `user_profile` claim을 검증해 Better Auth `user.additionalFields`를 채운다.
재로그인 시에도 `overrideUserInfo: true`로 같은 값을 다시 덮어쓴다.
`customSession()`은 저장된 user 필드만 `session.user` shape로 투영한다.
`nextCookies()`는 마지막에 둔다.

```ts
genericOAuth({
  config: [
    {
      providerId: AUTHENTIK_PROVIDER_ID,
      overrideUserInfo: true,
      async getUserInfo(tokens) {
        if (!tokens.accessToken) {
          return null
        }

        const jwtPayload = parseAuthentikAccessToken(tokens.accessToken)

        return {
          id: jwtPayload.sub,
          email: jwtPayload.email,
          emailVerified: jwtPayload.email_verified ?? false,
          name:
            jwtPayload.user_profile.display_name ??
            jwtPayload.name ??
            jwtPayload.email,
          image: jwtPayload.picture ?? undefined,
          user_profile: jwtPayload.user_profile,
        }
      },
      mapProfileToUser(profile) {
        return toStoredAuthentikUserProfile(
          authentikUserProfileSchema.parse(profile.user_profile)
        )
      },
    },
  ],
})
```

```ts
customSession(async ({ session, user }) => {
  return {
    session,
    user: toSessionUser(user),
  }
}, options)
```

```ts
const toSessionUser = (user: {
  uuid: string
  displayName?: string | null
  age?: number | null
  job?: string | null
  avatarSeed?: string | null
}) => {
  return {
    uuid: user.uuid,
    displayName: user.displayName ?? "default",
    age: user.age,
    job: user.job,
    avatarSeed: user.avatarSeed ?? "default",
  }
}
```

## `src/features/auth/lib/auth-client.ts`

`src/features/auth/lib/auth-client.ts`는 React client instance다.
클라이언트는 `genericOAuthClient()`와 세션 타입 추론용 plugin을 같이 붙인다.

```ts
export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient(),
    customSessionClient<typeof auth>(),
    inferAdditionalFields<typeof auth>(),
  ],
})

export const { signOut, useSession, getSession } = authClient
```

로그인은 `signIn.oauth2`로 시작한다.

```ts
await authClient.signIn.oauth2({
  providerId: "authentik",
  callbackURL,
  errorCallbackURL,
  scopes: ["openid", "profile", "email", "user_profile", "offline_access"],
})
```

## Access Token

서버와 클라이언트 모두 Better Auth가 authentik provider access token을 꺼내는 창구다.
`session.user`는 이 access token을 매 조회마다 다시 파싱하지 않는다.
access token은 API 호출이나 playground 확인이 필요할 때만 직접 꺼낸다.

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

## 프로필 수정

`src/features/profile/components/profile-form.tsx`는 profile-service에 저장한 뒤 Better Auth `updateUser()`도 바로 호출한다.
이 호출이 세션 cookie와 `useSession()` 값을 같이 갱신한다.
별도 `refreshToken()`이나 `refetch()`는 두지 않는다.

```ts
const age = values.age === "" ? null : Number(values.age)
const job = values.job === "" ? null : values.job

await patchMyProfile({
  age,
  avatar_seed: values.avatarSeed,
  display_name: values.displayName,
  job,
})

await authClient.updateUser({
  age,
  avatarSeed: values.avatarSeed,
  displayName: values.displayName,
  job,
})
```

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

이 페이지는 세션, JWT 원문, JWT 파싱 결과를 서버/클라이언트에서 나란히 비교한다.

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
```

## 주요 파일

- `src/app/api/auth/[...all]/route.ts`
- `src/app/example/playground/page.tsx`
- `src/app/example/playground/_components/playground-client.tsx`
- `src/features/auth/lib/auth.ts`
- `src/features/auth/lib/auth-client.ts`
- `src/features/auth/lib/server-session.ts`

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
