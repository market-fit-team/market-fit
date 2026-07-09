import { describe, expect, it } from "vitest"
import { getDefaultLoginOption } from "@/features/auth/lib/login-options"
import {
  buildLoginErrorCallbackURL,
  buildLoginSuccessCallbackURL,
  buildOAuthSignInPayload,
} from "@/features/auth/lib/oauth-sign-in"

describe("buildLoginErrorCallbackURL", () => {
  it("로그인 에러 리다이렉트에서 정규화된 콜백 URL을 유지한다", () => {
    expect(buildLoginErrorCallbackURL("/chat/thread-1")).toBe(
      "/login?callbackURL=%2Fchat%2Fthread-1&error=oauth"
    )
  })
})

describe("buildLoginSuccessCallbackURL", () => {
  it("로그인 성공 리다이렉트에서 정규화된 콜백 URL을 유지한다", () => {
    expect(buildLoginSuccessCallbackURL("/chat/thread-1")).toBe(
      "/login?callbackURL=%2Fchat%2Fthread-1"
    )
  })
})

describe("buildOAuthSignInPayload", () => {
  it("Google 옵션에 대한 Better Auth oauth2 파라미터를 생성한다", () => {
    expect(
      buildOAuthSignInPayload({
        callbackURL: "/chat/thread-1",
        loginOption: getDefaultLoginOption(),
      })
    ).toEqual({
      providerId: "authentik",
      callbackURL: "/login?callbackURL=%2Fchat%2Fthread-1",
      errorCallbackURL: "/login?callbackURL=%2Fchat%2Fthread-1&error=oauth",
      scopes: ["openid", "profile", "email", "user_profile", "offline_access"],
    })
  })

  it("잘못된 콜백 URL을 루트로 정규화한다", () => {
    expect(
      buildOAuthSignInPayload({
        callbackURL: "https://example.com",
        loginOption: getDefaultLoginOption(),
      })
    ).toEqual({
      providerId: "authentik",
      callbackURL: "/login?callbackURL=%2F",
      errorCallbackURL: "/login?callbackURL=%2F&error=oauth",
      scopes: ["openid", "profile", "email", "user_profile", "offline_access"],
    })
  })
})
