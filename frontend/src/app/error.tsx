"use client"

import { useEffect } from "react"
import { ErrorFallbackPanel } from "@/shared/components/errors/error-fallback-panel"

export default function Error({
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
    <main className="flex flex-1 bg-background">
      <ErrorFallbackPanel
        title="화면을 불러오지 못했습니다."
        description="일시적인 오류일 수 있습니다. 다시 시도해 주세요."
        onRetry={unstable_retry}
        onHome={() => {
          window.location.assign("/")
        }}
      />
    </main>
  )
}
