// src/app/example/sign-out/page.tsx
"use client"

// signOut 클라이언트 메서드 공식 문서
// https://better-auth.com/docs/basic-usage :contentReference[oaicite:44]{index=44}
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/features/auth/lib/auth-client"

export default function SignOutPage() {
  const router = useRouter()

  useEffect(() => {
    void (async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => router.replace("/"),
        },
      })
    })()
  }, [router])

  return <div>Signing out...</div>
}
