import { normalizeCallbackURL } from "./callback-url"
import { type LoginOption } from "./login-options"

export const OAUTH_LOGIN_ERROR = "oauth"

export type OAuthSignInPayload = {
  providerId: string
  callbackURL: string
  errorCallbackURL: string
  scopes: string[]
}

export const buildLoginErrorCallbackURL = (callbackURL: string) => {
  const searchParams = new URLSearchParams({
    callbackURL: normalizeCallbackURL(callbackURL),
    error: OAUTH_LOGIN_ERROR,
  })

  return `/login?${searchParams.toString()}`
}

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
    callbackURL: normalizedCallbackURL,
    errorCallbackURL: buildLoginErrorCallbackURL(normalizedCallbackURL),
    scopes: [...loginOption.scopes],
  }
}
