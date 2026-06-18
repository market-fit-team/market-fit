"use client"

import {
  redirect,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { type FallbackProps } from "react-error-boundary"
import { problemDetailSchema } from "@/shared/api/problem-detail-schema"

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

  if (isUnauthorized && pathname !== "/example/sign-in") {
    const callbackURL = `${pathname}${search ? `?${search}` : ""}`
    // Next.js App Router의 redirect()는 Client Component 렌더 중에도 사용할 수 있습니다.
    redirect(`/example/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`)
  }

  return (
    <div role="alert">
      <h2>{message ?? DEFAULT_ERROR_MESSAGE}</h2>
      <div>
        <button
          onClick={() => {
            resetErrorBoundary()
            router.refresh()
          }}
        >
          재시도
        </button>
        <button
          onClick={() => {
            window.location.assign("/")
          }}
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
