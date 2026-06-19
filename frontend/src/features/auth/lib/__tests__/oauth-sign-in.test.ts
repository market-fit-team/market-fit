import { describe, expect, it } from "vitest"
import { getDefaultLoginOption } from "@/features/auth/lib/login-options"
import {
  buildLoginErrorCallbackURL,
  buildOAuthSignInPayload,
} from "@/features/auth/lib/oauth-sign-in"

describe("buildLoginErrorCallbackURL", () => {
  it("keeps the normalized callback URL in the login error redirect", () => {
    expect(buildLoginErrorCallbackURL("/example/dashboard")).toBe(
      "/login?callbackURL=%2Fexample%2Fdashboard&error=oauth"
    )
  })
})

describe("buildOAuthSignInPayload", () => {
  it("builds Better Auth oauth2 params for the Google option", () => {
    expect(
      buildOAuthSignInPayload({
        callbackURL: "/example/dashboard",
        loginOption: getDefaultLoginOption(),
      })
    ).toEqual({
      providerId: "authentik",
      callbackURL: "/example/dashboard",
      errorCallbackURL: "/login?callbackURL=%2Fexample%2Fdashboard&error=oauth",
      scopes: ["openid", "profile", "email"],
    })
  })

  it("normalizes an invalid callback URL to root", () => {
    expect(
      buildOAuthSignInPayload({
        callbackURL: "https://example.com",
        loginOption: getDefaultLoginOption(),
      })
    ).toEqual({
      providerId: "authentik",
      callbackURL: "/",
      errorCallbackURL: "/login?callbackURL=%2F&error=oauth",
      scopes: ["openid", "profile", "email"],
    })
  })
})
