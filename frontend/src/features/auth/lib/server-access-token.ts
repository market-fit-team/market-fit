// src/features/auth/lib/server-access-token.ts
import { headers } from "next/headers"
import { auth } from "./auth"
import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

/**
 * Better Auth `getAccessToken` 응답에서 access token만 안전하게 추출하기 위한
 * 최소 로컬 타입이다.
 *
 * 현재 설치 버전 타입 추론만으로도 줄일 여지가 있지만, 서버 호출부가 토큰 문자열만
 * 필요로 할 때 접근 경로를 한 곳으로 모아두기 위해 남겨둔 상태다.
 */
type AccessTokenResult = {
  accessToken?: string
  data?: {
    accessToken?: string
  }
}

/**
 * Better Auth 응답 shape 차이를 흡수해서 access token만 반환한다.
 */
const extractAccessToken = (result: AccessTokenResult | null | undefined) => {
  return result?.accessToken ?? result?.data?.accessToken ?? null
}

/**
 * 서버 컴포넌트/RSC에서 Authentik OIDC access token을 읽기 위한 얇은 편의 래퍼다.
 *
 * 현재 `src` 기준 직접 사용처는 없어서 정리 후보에 가깝지만,
 * 서버에서 `auth.api.getAccessToken({ headers: await headers() })`를 반복 작성하지
 * 않으려는 목적의 래퍼라는 점을 주석으로 남긴다.
 */
export const getServerOidcAccessToken = async () => {
  const result = (await auth.api.getAccessToken({
    body: {
      providerId: AUTHENTIK_PROVIDER_ID,
    },
    headers: await headers(),
  })) as AccessTokenResult

  return extractAccessToken(result)
}
