"use client"

import { HeaderAuthButtonFallback } from "@/features/auth/components/header/header-auth-button-fallback"
import { HeaderAuthLoginButton } from "@/features/auth/components/header/header-auth-login-button"
import { HeaderAuthLogoutButton } from "@/features/auth/components/header/header-auth-logout-button"
import { useSession } from "@/features/auth/lib/auth-client"

export function HeaderAuthButton() {
  const { data: session, isPending } = useSession()

  if (isPending) {
    return <HeaderAuthButtonFallback />
  }

  if (!session) {
    return <HeaderAuthLoginButton />
  }

  return (
    <HeaderAuthLogoutButton
      avatarSeed={session.user.avatarSeed}
      userName={session.user.displayName}
    />
  )
}
