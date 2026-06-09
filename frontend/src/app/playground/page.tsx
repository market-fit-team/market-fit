// src/app/playground/page.tsx
import { Suspense } from "react"
import { headers } from "next/headers"
import { ErrorBoundary } from "react-error-boundary"
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query"
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

type JsonObject = Record<string, unknown>

const GATEWAY_BASE =
  process.env.GATEWAY_BASE_URL ??
  process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ??
  "http://localhost:8080"

const AUTH_BASE = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

const parseJsonSafe = (text: string): unknown => {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { raw: text } satisfies JsonObject
  }
}

const getTokenFromUnknown = (input: unknown): string | null => {
  if (!input || typeof input !== "object") return null
  const obj = input as JsonObject

  if (typeof obj.token === "string") return obj.token

  const data = obj.data
  if (data && typeof data === "object") {
    const dataObj = data as JsonObject
    if (typeof dataObj.token === "string") return dataObj.token
  }

  return null
}

const issueJwtFromCookie = async (): Promise<string | null> => {
  const h = await headers()
  const cookie = h.get("cookie") ?? ""
  if (!cookie) return null

  const res = await fetch(`${AUTH_BASE}/api/auth/token`, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  })

  if (!res.ok) return null

  const text = await res.text()
  const json = parseJsonSafe(text)
  return getTokenFromUnknown(json)
}

export default async function PlaygroundPage() {
  const session = await getServerSession()
  const jwt = await issueJwtFromCookie()

  const queryClient = new QueryClient()

  // 서버 사이드에서 데이터 미리 패칭 (prefetch)
  if (jwt) {
    await Promise.all([
      prefetchGetMeQuery(queryClient, {
        fetch: {
          headers: { Authorization: `Bearer ${jwt}` },
          cache: "no-store",
        },
      }),
      prefetchGetEchoQuery(queryClient, {
        fetch: {
          headers: { Authorization: `Bearer ${jwt}` },
          cache: "no-store",
        },
      }),
    ])
  }

  const dehydratedState = dehydrate(queryClient)

  // SSR 단계에서 서버용 캐시값을 꺼내 확인용 UI에 렌더링
  const serverProfile = jwt
    ? queryClient.getQueryData(getGetMeSuspenseQueryOptions().queryKey)
    : null
  const serverEcho = jwt
    ? queryClient.getQueryData(getGetEchoSuspenseQueryOptions().queryKey)
    : null

  return (
    <main>
      <div>
        <h1>/playground</h1>
        <p>서버 측 Shell (SSR)</p>
      </div>

      <section>
        <h2>서버 측 환경 변수 및 상태</h2>
        <div>
          GATEWAY_BASE: <code>{GATEWAY_BASE}</code>
        </div>
        <div>
          AUTH_BASE: <code>{AUTH_BASE}</code>
        </div>

        <h3>서버 세션</h3>
        <pre>{JSON.stringify(session ?? null, null, 2)}</pre>

        <h3>서버에서 발급받은 JWT</h3>
        <pre>
          {jwt ? `${jwt.slice(0, 32)}…` : "토큰 없음 (로그인이 필요합니다)"}
        </pre>

        <h3>프리페치된 Profile 데이터 (서버 캐시)</h3>
        <pre>{JSON.stringify(serverProfile, null, 2)}</pre>

        <h3>프리페치된 Echo 데이터 (서버 캐시)</h3>
        <pre>{JSON.stringify(serverEcho, null, 2)}</pre>
      </section>

      {/* 클라이언트 컴포넌트는 HydrationBoundary와 Suspense로 감싸서 분리 */}
      <ErrorBoundary FallbackComponent={PlaygroundErrorFallback}>
        <Suspense fallback={<PlaygroundSuspenseFallback />}>
          <HydrationBoundary state={dehydratedState}>
            <PlaygroundClient gatewayBase={GATEWAY_BASE} serverJwt={jwt} />
          </HydrationBoundary>
        </Suspense>
      </ErrorBoundary>
    </main>
  )
}
