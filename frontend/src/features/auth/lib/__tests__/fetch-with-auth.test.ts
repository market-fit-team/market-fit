import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  AuthSessionError,
  fetchWithAuth,
  fetchWithAuthResponse,
} from "@/features/auth/lib/fetch-with-auth"
import type { HttpStatusError } from "@/features/auth/lib/fetch-with-auth"

const getAccessTokenMock = vi.hoisted(() => vi.fn())

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    getAccessToken: getAccessTokenMock,
  },
}))

describe("fetchWithAuth", () => {
  beforeEach(() => {
    getAccessTokenMock.mockReset()
    vi.stubGlobal("fetch", vi.fn())
  })

  it("Better Auth access token을 Authorization 헤더에 주입한다", async () => {
    getAccessTokenMock.mockResolvedValue({
      data: {
        accessToken: "token-1",
      },
    })
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )

    await expect(fetchWithAuth<{ ok: boolean }>("/api/test")).resolves.toEqual({
      ok: true,
    })

    const init = vi.mocked(fetch).mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer token-1"
    )
  })

  it("access token이 없으면 요청을 보내지 않고 세션 오류를 던진다", async () => {
    getAccessTokenMock.mockResolvedValue({ data: {} })

    await expect(fetchWithAuth("/api/test")).rejects.toBeInstanceOf(
      AuthSessionError
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("HTTP 401 응답을 HttpStatusError로 변환한다", async () => {
    getAccessTokenMock.mockResolvedValue({ accessToken: "token-1" })
    vi.mocked(fetch).mockResolvedValue(
      new Response("unauthorized", {
        status: 401,
        headers: { "content-type": "text/plain" },
      })
    )

    await expect(fetchWithAuthResponse("/api/test")).rejects.toMatchObject({
      status: 401,
      body: "unauthorized",
    } satisfies Partial<HttpStatusError>)
  })
})
