// src/features/auth/lib/server-access-token.ts
import { headers } from "next/headers"
import { KEYCLOAK_PROVIDER_ID } from "./auth-constants"
import { auth } from "./auth"

type AccessTokenResult = {
  accessToken?: string
  data?: {
    accessToken?: string
  }
}

const extractAccessToken = (result: AccessTokenResult | null | undefined) => {
  return result?.accessToken ?? result?.data?.accessToken ?? null
}

export const getServerKeycloakAccessToken = async () => {
  const result = (await auth.api.getAccessToken({
    body: {
      providerId: KEYCLOAK_PROVIDER_ID,
    },
    headers: await headers(),
  })) as AccessTokenResult

  return extractAccessToken(result)
}
