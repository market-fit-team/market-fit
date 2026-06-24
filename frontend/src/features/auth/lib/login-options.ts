import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

export type LoginOption = {
  id: string
  label: string
  description: string
  oauthProviderId: string
  scopes: string[]
}

/**
 * 로그인 버튼/메뉴에서 사용할 옵션 목록이다.
 *
 * 지금은 사실상 Google 진입 1개뿐이라 다소 추상화가 큰 편이지만,
 * 이후 소셜 로그인 진입점이 늘어나면 UI와 payload 생성을 분리하기 쉬워진다.
 */
export const loginOptions = [
  {
    id: "google",
    label: "Continue with Google",
    description: "Google 계정으로 바로 로그인하고 이전 화면으로 돌아갑니다.",
    oauthProviderId: AUTHENTIK_PROVIDER_ID,
    scopes: ["openid", "profile", "email", "user_profile", "offline_access"],
  },
] satisfies readonly LoginOption[]

/**
 * 현재 로그인 화면의 기본 선택지를 반환한다.
 */
export const getDefaultLoginOption = () => {
  return loginOptions[0]
}
