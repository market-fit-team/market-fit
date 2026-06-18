// src/features/auth/components/sign-in-client.tsx
"use client"

import { authClient } from "@/features/auth/lib/auth-client"
import { AUTHENTIK_PROVIDER_ID } from "@/features/auth/lib/auth-constants"
import { Button } from "@/shared/components/ui/button"

export default function SignInClient({
  callbackURL,
  error,
}: {
  callbackURL: string
  error?: string
}) {
  return (
    <div>
      {error ? <div>Error: {error}</div> : null}

      <Button
        onClick={async () => {
          await authClient.signIn.oauth2({
            providerId: AUTHENTIK_PROVIDER_ID,
            callbackURL,
            errorCallbackURL: "/example/sign-in?error=oauth",
            scopes: ["openid", "profile", "email"],
          })
        }}
      >
        Continue with Authentik
      </Button>

      <div>
        callbackURL: <code>{callbackURL}</code>
      </div>
    </div>
  )
}
