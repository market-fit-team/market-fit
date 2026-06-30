"use client"

import {
  redirect,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { type FallbackProps } from "react-error-boundary"
import { problemDetailSchema } from "@/shared/api/problem-detail-schema"
import { ErrorFallbackPanel } from "@/shared/components/errors/error-fallback-panel"

const DEFAULT_ERROR_MESSAGE = "알 수 없는 에러가 발생했습니다."

export function MainErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parsedError = problemDetailSchema.safeParse(error)
  const search = searchParams.toString()
  const isUnauthorized = parsedError.success && parsedError.data.status === 401
  const message = parsedError.success
    ? (parsedError.data.detail ?? parsedError.data.title)
    : undefined

  if (isUnauthorized && pathname !== "/login") {
    const callbackURL = `${pathname}${search ? `?${search}` : ""}`
    // Next.js App Router의 redirect()는 Client Component 렌더 중에도 사용할 수 있습니다.
    redirect(`/login?callbackURL=${encodeURIComponent(callbackURL)}`)
  }

  return (
    <ErrorFallbackPanel
      title={message ?? DEFAULT_ERROR_MESSAGE}
      onRetry={() => {
        resetErrorBoundary()
        router.refresh()
      }}
      onHome={() => {
        window.location.assign("/")
      }}
    />
  )
}
