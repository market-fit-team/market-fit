// src/features/auth/lib/server-access-token.ts
import { headers } from "next/headers"
import { auth } from "./auth"
import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

type AccessTokenResult = {
  accessToken?: string
  data?: {
    accessToken?: string
  }
}

const extractAccessToken = (result: AccessTokenResult | null | undefined) => {
  return result?.accessToken ?? result?.data?.accessToken ?? null
}

export const getServerOidcAccessToken = async () => {
  const result = (await auth.api.getAccessToken({
    body: {
      providerId: AUTHENTIK_PROVIDER_ID,
    },
    headers: await headers(),
  })) as AccessTokenResult

  return extractAccessToken(result)
}
