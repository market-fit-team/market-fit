// src/features/auth/components/user-nav.tsx
"use client"

// useSession: reactive 훅 공식 제공
// https://better-auth.com/docs/basic-usage :contentReference[oaicite:38]{index=38}
// signOut: 클라이언트 signOut 공식 제공
// https://better-auth.com/docs/basic-usage :contentReference[oaicite:39]{index=39}
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/features/auth/lib/auth-client"
import { Button } from "@/shared/components/ui/button"

export function UserNav() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  if (isPending) return <div>Loading session...</div>

  if (!session) {
    return (
      <div>
        <Button asChild>
          <Link href="/example/sign-in">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div>
        Signed in as <b>{session.user.displayName}</b>
      </div>
      <Button
        onClick={async () => {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => router.push("/"),
            },
          })
        }}
      >
        Sign out
      </Button>
    </div>
  )
}
