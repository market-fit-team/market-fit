import { describe, expect, it } from "vitest"
import { normalizeCallbackURL } from "@/features/auth/lib/callback-url"

describe("normalizeCallbackURL", () => {
  it("유효한 상대 경로를 유지한다", () => {
    expect(normalizeCallbackURL("/example/dashboard")).toBe(
      "/example/dashboard"
    )
  })

  it("쿼리 문자열과 해시를 유지한다", () => {
    expect(normalizeCallbackURL("/report?tab=summary#metrics")).toBe(
      "/report?tab=summary#metrics"
    )
  })

  it("배열의 첫 번째 값을 사용한다", () => {
    expect(normalizeCallbackURL(["/map", "/report"])).toBe("/map")
  })

  it("빈 값에 대해 루트 경로로 대체한다", () => {
    expect(normalizeCallbackURL("")).toBe("/")
    expect(normalizeCallbackURL("   ")).toBe("/")
    expect(normalizeCallbackURL(undefined)).toBe("/")
  })

  it("절대 경로 또는 프로토콜 상대 URL에 대해 루트 경로로 대체한다", () => {
    expect(normalizeCallbackURL("https://example.com/dashboard")).toBe("/")
    expect(normalizeCallbackURL("//example.com/dashboard")).toBe("/")
  })

  it("경로가 아닌 값에 대해 루트 경로로 대체한다", () => {
    expect(normalizeCallbackURL("dashboard")).toBe("/")
    expect(normalizeCallbackURL({ path: "/dashboard" })).toBe("/")
  })
})
