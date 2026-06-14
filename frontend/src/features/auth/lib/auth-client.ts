// src/features/auth/lib/auth-client.ts
import { genericOAuthClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

export const { signOut, useSession, getSession } = authClient
