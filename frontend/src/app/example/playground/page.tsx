// src/app/example/playground/page.tsx
import { Suspense } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query"
import { getServerOidcAccessToken } from "@/features/auth/lib/server-access-token"
import { getServerSession } from "@/features/auth/lib/server-session"
import PlaygroundClient from "@/features/playground/components/playground-client"
import {
  PlaygroundErrorFallback,
  PlaygroundSuspenseFallback,
} from "@/features/playground/components/playground-fallback"
import {
  getGetEchoSuspenseQueryOptions,
  prefetchGetEchoQuery,
} from "@/shared/api/generated/echo/endpoints/echo/echo"
import {
  getGetMeSuspenseQueryOptions,
  prefetchGetMeQuery,
} from "@/shared/api/generated/profile/endpoints/profile/profile"

export const dynamic = "force-dynamic"

const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8088"
const AUTH_BASE = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

export default async function PlaygroundPage() {
  const session = await getServerSession()
  const accessToken = await getServerOidcAccessToken()

  const queryClient = new QueryClient()

  if (accessToken) {
    await Promise.all([
      prefetchGetMeQuery(queryClient, {
        request: {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      }),
      prefetchGetEchoQuery(queryClient, {
        request: {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      }),
    ])
  }

  const dehydratedState = dehydrate(queryClient)
  const serverProfile = accessToken
    ? queryClient.getQueryData(getGetMeSuspenseQueryOptions().queryKey)
    : null
  const serverEcho = accessToken
    ? queryClient.getQueryData(getGetEchoSuspenseQueryOptions().queryKey)
    : null

  return (
    <main>
      <div>
        <h1>/example/playground</h1>
        <p>서버 측 Shell (SSR)</p>
      </div>

      <section>
        <h2>서버 측 환경 변수 및 상태</h2>
        <div>
          API_ORIGIN: <code>{API_ORIGIN}</code>
        </div>
        <div>
          AUTH_BASE: <code>{AUTH_BASE}</code>
        </div>

        <h3>서버 세션</h3>
        <pre>{JSON.stringify(session ?? null, null, 2)}</pre>

        <h3>서버에서 가져온 OIDC access token</h3>
        <pre>
          {accessToken
            ? `${accessToken.slice(0, 32)}…`
            : "토큰 없음 (로그인이 필요합니다)"}
        </pre>

        <h3>프리페치된 Profile 데이터 (서버 캐시)</h3>
        <pre>{JSON.stringify(serverProfile, null, 2)}</pre>

        <h3>프리페치된 Echo 데이터 (서버 캐시)</h3>
        <pre>{JSON.stringify(serverEcho, null, 2)}</pre>
      </section>

      <ErrorBoundary FallbackComponent={PlaygroundErrorFallback}>
        <Suspense fallback={<PlaygroundSuspenseFallback />}>
          <HydrationBoundary state={dehydratedState}>
            <PlaygroundClient
              apiOrigin={API_ORIGIN}
              serverAccessToken={accessToken}
            />
          </HydrationBoundary>
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}
