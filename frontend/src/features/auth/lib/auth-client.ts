// src/features/auth/lib/auth-client.ts
import {
  customSessionClient,
  genericOAuthClient,
  inferAdditionalFields,
} from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"
import type { auth } from "./auth"

export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient(),
    customSessionClient<typeof auth>(),
    inferAdditionalFields<typeof auth>(),
  ],
})

export const { signOut, useSession, getSession } = authClient
