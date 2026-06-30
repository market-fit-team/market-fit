"use client"

import { useEffect } from "react"
import { ErrorFallbackPanel } from "@/shared/components/errors/error-fallback-panel"
import "./globals.css"

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <main className="flex min-h-dvh bg-background">
          <ErrorFallbackPanel
            title="앱을 불러오지 못했습니다."
            description="루트 화면을 복구하지 못했습니다. 다시 시도하거나 홈으로 이동해 주세요."
            onRetry={unstable_retry}
            onHome={() => {
              window.location.assign("/")
            }}
          />
        </main>
      </body>
    </html>
  )
}
