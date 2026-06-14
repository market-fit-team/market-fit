"use client"

import { useState } from "react"
import { useErrorBoundary } from "react-error-boundary"
import { authClient } from "@/features/auth/lib/auth-client"
import { AUTHENTIK_PROVIDER_ID } from "@/features/auth/lib/auth-constants"
import { useGetEchoSuspense } from "@/shared/api/generated/echo/endpoints/echo/echo"
import { useGetMeSuspense } from "@/shared/api/generated/profile/endpoints/profile/profile"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

type AccessTokenResult = {
  accessToken?: string
  data?: {
    accessToken?: string
  }
}

const extractAccessToken = (result: AccessTokenResult | null | undefined) => {
  return result?.accessToken ?? result?.data?.accessToken ?? null
}

export default function PlaygroundClient({
  apiOrigin,
  serverAccessToken,
}: {
  apiOrigin: string
  serverAccessToken: string | null
}) {
  const { data: session, isPending } = authClient.useSession()
  const { showBoundary } = useErrorBoundary()
  const [tokenPreview, setTokenPreview] = useState<string>("")

  const { data: profile } = useGetMeSuspense({
    request: serverAccessToken
      ? {
          headers: { Authorization: `Bearer ${serverAccessToken}` },
        }
      : undefined,
  })
  const { data: echo } = useGetEchoSuspense({
    request: serverAccessToken
      ? {
          headers: { Authorization: `Bearer ${serverAccessToken}` },
        }
      : undefined,
  })

  const getOidcAccessTokenClient = async (): Promise<string | null> => {
    const result = (await authClient.getAccessToken({
      providerId: AUTHENTIK_PROVIDER_ID,
    })) as AccessTokenResult

    return extractAccessToken(result)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>클라이언트 컴포넌트 (Hydration & Suspense 완료)</CardTitle>
        <CardDescription>
          호출 대상: <code>{apiOrigin}</code> (CORS는 Traefik이 처리)
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div>
          <h3>클라이언트 세션</h3>
          <pre>
            {isPending
              ? "불러오는 중..."
              : JSON.stringify(session ?? null, null, 2)}
          </pre>
        </div>

        <div>
          <Button
            onClick={async () => {
              try {
                const token = await getOidcAccessTokenClient()
                if (!token) {
                  setTokenPreview("")
                  showBoundary(
                    new Error(
                      "OIDC access token 조회 실패 (먼저 로그인해주세요)"
                    )
                  )
                  return
                }
                setTokenPreview(`${token.slice(0, 32)}…`)
              } catch (err) {
                showBoundary(err)
              }
            }}
          >
            클라이언트에서 OIDC access token 조회
          </Button>

          <Button variant="outline" disabled>
            (데이터는 Suspense를 통해 자동 로드됨)
          </Button>
        </div>

        <div>
          <h3>클라이언트 access token 미리보기</h3>
          <pre>{tokenPreview || "—"}</pre>
        </div>

        <div>
          <h3>Profile 응답 결과 (React Query 캐시)</h3>
          <pre>{JSON.stringify(profile, null, 2)}</pre>
        </div>

        <div>
          <h3>Echo 응답 결과 (React Query 캐시)</h3>
          <pre>{JSON.stringify(echo, null, 2)}</pre>
        </div>
      </CardContent>
    </Card>
  )
}
