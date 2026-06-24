import { normalizeCallbackURL } from "./callback-url"
import { type LoginOption } from "./login-options"

export const OAUTH_LOGIN_ERROR = "oauth"

export type OAuthSignInPayload = {
  providerId: string
  callbackURL: string
  errorCallbackURL: string
  scopes: string[]
}

export const buildLoginSuccessCallbackURL = (callbackURL: string) => {
  const searchParams = new URLSearchParams({
    callbackURL: normalizeCallbackURL(callbackURL),
  })

  return `/login?${searchParams.toString()}`
}

/**
 * OAuth 로그인 실패 시 돌아올 에러 콜백 URL을 만든다.
 *
 * callbackURL도 먼저 정규화해서, 성공/실패 흐름 모두 같은 안전 규칙을 쓰게 한다.
 */
export const buildLoginErrorCallbackURL = (callbackURL: string) => {
  const searchParams = new URLSearchParams({
    callbackURL: normalizeCallbackURL(callbackURL),
    error: OAUTH_LOGIN_ERROR,
  })

  return `/login?${searchParams.toString()}`
}

/**
 * Better Auth `signIn.oauth2`에 넘길 payload를 조립한다.
 *
 * 로그인 UI가 provider 세부 구현을 직접 알지 않도록,
 * callbackURL / errorCallbackURL / scopes 구성을 한 곳에 모은다.
 */
export const buildOAuthSignInPayload = ({
  callbackURL,
  loginOption,
}: {
  callbackURL: string
  loginOption: LoginOption
}): OAuthSignInPayload => {
  const normalizedCallbackURL = normalizeCallbackURL(callbackURL)

  return {
    providerId: loginOption.oauthProviderId,
    callbackURL: buildLoginSuccessCallbackURL(normalizedCallbackURL),
    errorCallbackURL: buildLoginErrorCallbackURL(normalizedCallbackURL),
    scopes: [...loginOption.scopes],
  }
}
