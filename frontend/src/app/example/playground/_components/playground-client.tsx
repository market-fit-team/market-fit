"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { authClient } from "@/features/auth/lib/auth-client"
import { AUTHENTIK_PROVIDER_ID } from "@/features/auth/lib/auth-constants"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

type JwtPayload = {
  [key: string]: unknown
  aud?: string | string[]
  exp?: number
  iat?: number
  iss?: string
  sub?: string
}

// 클라이언트 쪽 결과도 서버 출력과 같은 형식으로 맞춰 비교하기 쉽게 만든다.
const formatJson = (value: unknown) => {
  return JSON.stringify(value ?? null, null, 2)
}

// hook/fetch/파싱 단계 오류를 pre 영역에 그대로 출력할 수 있게 문자열로 바꾼다.
const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return JSON.stringify(error ?? null, null, 2)
}

// 브라우저에서도 access token payload를 직접 열어 서버 결과와 claim 차이가 없는지 확인한다.
const decodeJwtPayload = (token: string): JwtPayload => {
  const [, payload = ""] = token.split(".")
  const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/")
  const paddedPayload = normalizedPayload.padEnd(
    normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
    "="
  )

  return JSON.parse(atob(paddedPayload)) as JwtPayload
}

// 클라이언트 비교 섹션 공용 카드다.
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

export default function PlaygroundClient() {
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [accessTokenError, setAccessTokenError] = useState<string | null>(null)
  const [isAccessTokenPending, setIsAccessTokenPending] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadAccessToken = async () => {
      // useSession이 끝나기 전에는 토큰 조회 여부를 결정할 수 없으므로 먼저 대기한다.
      if (isSessionPending) {
        return
      }

      if (!session) {
        if (!isMounted) {
          return
        }

        setAccessToken(null)
        setAccessTokenError("클라이언트 세션이 없습니다.")
        setIsAccessTokenPending(false)
        return
      }

      setIsAccessTokenPending(true)
      setAccessTokenError(null)

      try {
        // 클라이언트에서는 Better Auth client API로 access token을 받아온다.
        const result = await authClient.getAccessToken({
          providerId: AUTHENTIK_PROVIDER_ID,
        })

        if (!isMounted) {
          return
        }

        setAccessToken(result.data?.accessToken ?? null)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setAccessToken(null)
        setAccessTokenError(getErrorMessage(error))
      } finally {
        if (isMounted) {
          setIsAccessTokenPending(false)
        }
      }
    }

    void loadAccessToken()

    return () => {
      isMounted = false
    }
  }, [isSessionPending, session])

  const parsedJwtResult = useMemo(() => {
    if (!accessToken) {
      return {
        error: null,
        payload: null,
      }
    }

    try {
      return {
        error: null,
        payload: decodeJwtPayload(accessToken),
      }
    } catch (error) {
      return {
        error: getErrorMessage(error),
        payload: null,
      }
    }
  }, [accessToken])

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <PlaygroundSection title="클라이언트 세션 (useSession)">
        {isSessionPending ? "세션 불러오는 중..." : formatJson(session)}
      </PlaygroundSection>

      <PlaygroundSection title="클라이언트 JWT 원문 (getAccessToken)">
        {isAccessTokenPending
          ? "JWT 불러오는 중..."
          : accessTokenError
            ? accessTokenError
            : (accessToken ?? "access token 없음")}
      </PlaygroundSection>

      <PlaygroundSection title="클라이언트 JWT 파싱 결과">
        {isAccessTokenPending
          ? "JWT 파싱 대기 중..."
          : accessTokenError || parsedJwtResult.error
            ? (accessTokenError ?? parsedJwtResult.error)
            : formatJson(parsedJwtResult.payload)}
      </PlaygroundSection>
    </section>
  )
}
