"use client"

import { useState } from "react"
import { AUTHENTIK_PROVIDER_ID } from "@/features/auth/lib/auth-constants"
import { authClient } from "@/features/auth/lib/auth-client"
import { patchMyProfile } from "@/shared/api/generated/profile/endpoints/profile/profile"

type RefreshTokenResult = {
  accessToken?: string
  refreshToken?: string
  providerId?: string
  accountId?: string
}

const stringify = (value: unknown) => JSON.stringify(value ?? null, null, 2)

export default function ProfilePage() {
  const { data: session, isPending, refetch } = authClient.useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<string>("")
  const [error, setError] = useState<string>("")

  const handleUpdateProfile = async () => {
    setIsSubmitting(true)
    setResult("")
    setError("")

    try {
      const nextDisplayName = `test-${Math.random().toString(36).slice(2, 10)}`
      const sessionUserBeforeRefresh = session?.user ?? null
      const patchResponse = await patchMyProfile({
        display_name: nextDisplayName,
      })
      const response = (await authClient.refreshToken({
        providerId: AUTHENTIK_PROVIDER_ID,
      })) as { data?: RefreshTokenResult }

      await refetch()
      const refreshedSession = await authClient.getSession()

      setResult(
        stringify({
          requestedDisplayName: nextDisplayName,
          sessionUserBeforeRefresh,
          patchResponse,
          refreshTokenResponse: response.data ?? null,
          sessionUserAfterRefetch: refreshedSession.data?.user ?? null,
        })
      )
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : stringify(refreshError)
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="space-y-6 p-8">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Profile Refresh Test</h1>
        <p className="text-sm text-muted-foreground">
          버튼을 누르면 랜덤 닉네임 저장 후 Better Auth `refreshToken`과
          `useSession` 재조회를 순서대로 실행합니다.
        </p>
      </section>

      <button
        type="button"
        onClick={handleUpdateProfile}
        disabled={isPending || isSubmitting || !session}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "Updating..." : "Update Random Display Name"}
      </button>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Current Session User</h2>
        <pre className="overflow-x-auto rounded-md border p-4 text-xs">
          {isPending ? "Loading..." : stringify(session?.user)}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Refresh Result</h2>
        <pre className="overflow-x-auto rounded-md border p-4 text-xs">
          {result || "No result yet."}
        </pre>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Error</h2>
        <pre className="overflow-x-auto rounded-md border p-4 text-xs">
          {error || "No error."}
        </pre>
      </section>
    </main>
  )
}
