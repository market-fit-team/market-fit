"use client"

import { useState } from "react"
import { useErrorBoundary } from "react-error-boundary"
import { authClient } from "@/features/auth/lib/auth-client"
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

export default function PlaygroundClient({
  gatewayBase,
  serverJwt,
}: {
  gatewayBase: string
  serverJwt: string | null
}) {
  const { data: session, isPending } = authClient.useSession()
  const { showBoundary } = useErrorBoundary()
  const [jwtPreview, setJwtPreview] = useState<string>("")

  // 서버에서 prefetch된 캐시를 Hydration 받아 즉시 렌더링됩니다.
  // 네트워크 지연 없이 화면에 바로 출력됩니다.
  const { data: profile } = useGetMeSuspense({
    fetch: {
      headers: { Authorization: `Bearer ${serverJwt || ""}` },
    },
  })
  const { data: echo } = useGetEchoSuspense({
    fetch: {
      headers: { Authorization: `Bearer ${serverJwt || ""}` },
    },
  })

  const issueJwtClient = async (): Promise<string | null> => {
    const tokenResult = await authClient.token()
    return tokenResult.data?.token || null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>클라이언트 컴포넌트 (Hydration & Suspense 완료)</CardTitle>
        <CardDescription>
          호출 대상: <code>{gatewayBase}</code> (CORS는 nginx가 처리)
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
                const token = await issueJwtClient()
                if (!token) {
                  setJwtPreview("")
                  showBoundary(
                    new Error("토큰 발급 실패 (먼저 로그인해주세요)")
                  )
                  return
                }
                setJwtPreview(`${token.slice(0, 32)}…`)
              } catch (err) {
                showBoundary(err)
              }
            }}
          >
            클라이언트에서 JWT 발급 테스트
          </Button>

          <Button variant="outline" disabled>
            (데이터는 Suspense를 통해 자동 로드됨)
          </Button>
        </div>

        <div>
          <h3>클라이언트에서 발급받은 JWT 미리보기</h3>
          <pre>{jwtPreview || "—"}</pre>
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
