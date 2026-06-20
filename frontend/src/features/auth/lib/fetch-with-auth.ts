import { authClient } from "./auth-client"
import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

/**
 * 브라우저 환경에서 Better Auth가 보관 중인 Authentik access token을 조회한다.
 *
 * Orval 생성 API들이 공통으로 이 경로를 타므로, 토큰 조회 방식이 바뀌면
 * 각 endpoint 파일이 아니라 이 함수 한 곳만 조정하면 된다.
 */
const getClientOidcAccessToken = async () => {
  const { data } = await authClient.getAccessToken({
    providerId: AUTHENTIK_PROVIDER_ID,
  })

  return data?.accessToken
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
