import { AUTHENTIK_PROVIDER_ID } from "./auth-constants"

export type LoginOption = {
  id: string
  label: string
  description: string
  oauthProviderId: string
  scopes: string[]
}

export const loginOptions = [
  {
    id: "google",
    label: "Continue with Google",
    description: "Google 계정으로 바로 로그인하고 이전 화면으로 돌아갑니다.",
    oauthProviderId: AUTHENTIK_PROVIDER_ID,
    scopes: ["openid", "profile", "email"],
  },
] satisfies readonly LoginOption[]

export const getDefaultLoginOption = () => {
  return loginOptions[0]
}
