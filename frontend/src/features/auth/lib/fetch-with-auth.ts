import { authClient } from "./auth-client"
import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

type AccessTokenResult = {
  accessToken?: string
  data?: {
    accessToken?: string
  }
}

export class AuthSessionError extends Error {
  constructor(message = "로그인 세션의 access token을 확인하지 못했습니다.") {
    super(message)
    this.name = "AuthSessionError"
  }
}

export class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown
  ) {
    super(`HTTP ${status}`)
    this.name = "HttpStatusError"
  }
}

const extractAccessToken = (result: AccessTokenResult | null | undefined) => {
  return result?.accessToken ?? result?.data?.accessToken
}

/**
 * 브라우저 환경에서 Better Auth가 보관 중인 Authentik access token을 조회한다.
 *
 * Orval 생성 API와 @langchain/react stream fetch가 공통으로 이 경로를 탄다.
 * Better Auth는 provider access token 조회 시 만료된 token refresh를 수행한다.
 * https://better-auth.com/docs/concepts/oauth#get-access-token
 */
export const getClientOidcAccessToken = async () => {
  const result = (await authClient.getAccessToken({
    providerId: AUTHENTIK_PROVIDER_ID,
  })) as AccessTokenResult
  const accessToken = extractAccessToken(result)

  if (!accessToken) {
    throw new AuthSessionError()
  }

  return accessToken
}

/**
 * 공통 fetch 래퍼에서 사용할 응답 본문 파서다.
 *
 * JSON 응답은 객체로, 그 외 응답은 문자열로 돌려주고, 204는 undefined로
 * 정규화해서 호출부가 상태 코드 분기를 중복하지 않게 한다.
 */
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

export const fetchWithAuthResponse: typeof fetch = async (input, init) => {
  const headers = new Headers(init?.headers)

  if (!headers.has("authorization")) {
    if (typeof window === "undefined") {
      throw new AuthSessionError()
    }
    const accessToken = await getClientOidcAccessToken()
    headers.set("authorization", `Bearer ${accessToken}`)
  }

  const response = await fetch(input, {
    ...init,
    headers,
  })

  if (!response.ok) {
    throw new HttpStatusError(
      response.status,
      await parseResponseBody(response)
    )
  }

  return response
}

/**
 * 프론트엔드 공용 인증 fetch 래퍼다.
 *
 * 브라우저에서 호출될 때 Authorization 헤더가 비어 있으면 Better Auth를 통해
 * access token을 꺼내 자동 주입한다. 현재 Orval generated API들이 대량으로
 * 의존하는 진입점이라, 인증 헤더 정책을 한 곳에 모아두는 역할을 한다.
 */
export const fetchWithAuth = async <T>(
  input: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetchWithAuthResponse(input, init)

  return (await parseResponseBody(response)) as T
}
