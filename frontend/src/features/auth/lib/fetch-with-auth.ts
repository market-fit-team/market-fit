import { authClient } from "./auth-client"
import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

const getClientOidcAccessToken = async () => {
  const { data } = await authClient.getAccessToken({
    providerId: AUTHENTIK_PROVIDER_ID,
  })

  return data?.accessToken
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

export const fetchWithAuth = async <T>(
  input: string,
  init?: RequestInit
): Promise<T> => {
  const headers = new Headers(init?.headers)

  if (!headers.has("authorization") && typeof window !== "undefined") {
    const accessToken = await getClientOidcAccessToken()

    if (accessToken) {
      headers.set("authorization", `Bearer ${accessToken}`)
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw await parseResponseBody(response)
  }

  return (await parseResponseBody(response)) as T
}
