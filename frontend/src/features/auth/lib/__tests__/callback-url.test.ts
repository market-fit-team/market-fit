import { describe, expect, it } from "vitest"
import { normalizeCallbackURL } from "@/features/auth/lib/callback-url"

describe("normalizeCallbackURL", () => {
  it("keeps a valid relative path", () => {
    expect(normalizeCallbackURL("/example/dashboard")).toBe(
      "/example/dashboard"
    )
  })

  it("keeps query strings and hashes", () => {
    expect(normalizeCallbackURL("/report?tab=summary#metrics")).toBe(
      "/report?tab=summary#metrics"
    )
  })

  it("uses the first value from an array", () => {
    expect(normalizeCallbackURL(["/map", "/report"])).toBe("/map")
  })

  it("falls back to root for empty values", () => {
    expect(normalizeCallbackURL("")).toBe("/")
    expect(normalizeCallbackURL("   ")).toBe("/")
    expect(normalizeCallbackURL(undefined)).toBe("/")
  })

  it("falls back to root for absolute or protocol-relative URLs", () => {
    expect(normalizeCallbackURL("https://example.com/dashboard")).toBe("/")
    expect(normalizeCallbackURL("//example.com/dashboard")).toBe("/")
  })

  it("falls back to root for non-path values", () => {
    expect(normalizeCallbackURL("dashboard")).toBe("/")
    expect(normalizeCallbackURL({ path: "/dashboard" })).toBe("/")
  })
})
