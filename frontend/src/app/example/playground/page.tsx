import { type ReactNode } from "react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import PlaygroundClient from "@/app/example/playground/_components/playground-client"
import { auth } from "@/features/auth/lib/auth"
import { AUTHENTIK_PROVIDER_ID } from "@/features/auth/lib/auth-constants"
import { getServerSession } from "@/features/auth/lib/server-session"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

export const dynamic = "force-dynamic"

type JwtPayload = {
  [key: string]: unknown
  aud?: string | string[]
  exp?: number
  iat?: number
  iss?: string
  sub?: string
}

// 객체/토큰/응답을 화면에서 바로 비교하기 쉽도록 고정된 pretty JSON 문자열로 만든다.
const formatJson = (value: unknown) => {
  return JSON.stringify(value ?? null, null, 2)
}

// 서버 fetch/토큰 파싱 단계에서 터진 예외를 문자열로 평탄화해서 바로 렌더링한다.
const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return JSON.stringify(error ?? null, null, 2)
}

// 서버에서는 access token payload를 직접 파싱해서 Authentik이 실제로 어떤 claim을 발급했는지 확인한다.
const decodeJwtPayload = (token: string): JwtPayload => {
  const [, payload = ""] = token.split(".")
  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/")
  const paddedPayload = normalizedPayload.padEnd(
    normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
    "="
  )

  return JSON.parse(
    Buffer.from(paddedPayload, "base64").toString("utf8")
  ) as JwtPayload
}

// 서버/클라이언트 섹션을 같은 시각 구조로 맞춰 비교하기 쉽게 만든 공용 출력 카드다.
function PlaygroundSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-md bg-muted/40 p-4 text-xs break-all whitespace-pre-wrap">
          {children}
        </pre>
      </CardContent>
    </Card>
  )
}

export default async function PlaygroundPage() {
  const session = await getServerSession()

  // 이 페이지는 인증된 상태에서만 비교가 의미 있으므로 세션이 없으면 바로 홈으로 돌려보낸다.
  if (!session) {
    redirect("/")
  }

  let accessTokenError: string | null = null
  let accessToken: string | null = null
  let parsedJwt: JwtPayload | null = null
  let parsedJwtError: string | null = null

  try {
    // 서버에서는 Better Auth API로 access token을 직접 가져와 SSR 시점 정보를 보여준다.
    const accessTokenResult = await auth.api.getAccessToken({
      body: {
        providerId: AUTHENTIK_PROVIDER_ID,
      },
      headers: await headers(),
    })

    accessToken = accessTokenResult?.accessToken ?? null
  } catch (error) {
    accessTokenError = getErrorMessage(error)
  }

  if (accessToken) {
    try {
      // JWT payload를 그대로 보여줘서 커스텀 claim이 실제로 들어오는지 확인한다.
      parsedJwt = decodeJwtPayload(accessToken)
    } catch (error) {
      parsedJwtError = getErrorMessage(error)
    }
  } else if (!accessTokenError) {
    accessTokenError = "access token 없음"
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">/example/playground</h1>
        <p className="text-sm text-muted-foreground">
          Better Auth 세션과 Authentik JWT / 사용자 정보를 서버와 클라이언트에서
          각각 비교하는 페이지입니다.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <PlaygroundSection title="서버 세션 (getServerSession)">
          {formatJson(session)}
        </PlaygroundSection>

        <PlaygroundSection title="서버 JWT 원문 (auth.api.getAccessToken)">
          {accessTokenError ?? accessToken}
        </PlaygroundSection>

        <PlaygroundSection title="서버 JWT 파싱 결과">
          {parsedJwtError ?? formatJson(parsedJwt)}
        </PlaygroundSection>
      </section>

      <PlaygroundClient />
    </main>
  )
}
