// src/features/auth/components/sign-in-client.tsx
"use client"

import { KEYCLOAK_PROVIDER_ID } from "@/features/auth/lib/auth-constants"
import { authClient } from "@/features/auth/lib/auth-client"
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
            providerId: KEYCLOAK_PROVIDER_ID,
            callbackURL,
            errorCallbackURL: "/sign-in?error=oauth",
            scopes: ["openid", "profile", "email"],
          })
        }}
      >
        Continue with Keycloak
      </Button>

      <div>
        callbackURL: <code>{callbackURL}</code>
      </div>
    </div>
  )
}
