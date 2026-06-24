// src/app/example/sign-out/page.tsx
"use client"

// signOut 클라이언트 메서드 공식 문서
// https://better-auth.com/docs/basic-usage#signout
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/features/auth/lib/auth-client"
import { clearClientSessionState } from "@/features/auth/lib/client-session-cleanup"

export default function SignOutPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    void (async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            clearClientSessionState(queryClient)
            router.replace("/")
          },
        },
      })
    })()
  }, [queryClient, router])

  return <div>Signing out...</div>
}
