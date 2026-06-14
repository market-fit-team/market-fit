// src/features/auth/lib/fetch-with-auth.ts
import { KEYCLOAK_PROVIDER_ID } from "./auth-constants"
import { authClient } from "./auth-client"

type AccessTokenResult = {
  accessToken?: string
  data?: {
    accessToken?: string
  }
  error?: unknown
}

const extractAccessToken = (result: AccessTokenResult | null | undefined) => {
  return result?.accessToken ?? result?.data?.accessToken
}

const getClientKeycloakAccessToken = async () => {
  const result = (await authClient.getAccessToken({
    providerId: KEYCLOAK_PROVIDER_ID,
  })) as AccessTokenResult

  return extractAccessToken(result)
}

const parseResponseBody = async (response: Response) => {
  if (response.status === 204) {
    return undefined
  }

  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.includes("application/json")) {
    return response.json()
  }

  return response.text()
}

const createHttpError = async (response: Response) => {
  const detail = await response.text().catch(() => "")
  return new Error(`API request failed: ${response.status} ${detail}`)
}

export const fetchWithAuth = async <T>(
  input: string,
  init?: RequestInit
): Promise<T> => {
  const headers = new Headers(init?.headers)

  if (!headers.has("authorization") && typeof window !== "undefined") {
    const accessToken = await getClientKeycloakAccessToken()

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`)
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw await createHttpError(response)
  }

  const data = await parseResponseBody(response)

  return {
    data,
    status: response.status,
    headers: response.headers,
  } as T
}
