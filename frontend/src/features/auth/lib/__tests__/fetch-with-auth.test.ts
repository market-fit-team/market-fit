import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchWithAuth,
  fetchWithAuthResponse,
} from "@/features/auth/lib/fetch-with-auth"
import type { HttpStatusError } from "@/features/auth/lib/fetch-with-auth"

const { getAccessTokenMock, signOutMock } = vi.hoisted(() => ({
  getAccessTokenMock: vi.fn(),
  signOutMock: vi.fn(),
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    getAccessToken: getAccessTokenMock,
    signOut: signOutMock,
  },
}))

describe("fetchWithAuth", () => {
  beforeEach(() => {
    getAccessTokenMock.mockReset()
    signOutMock.mockReset()
    signOutMock.mockResolvedValue(undefined)
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

  it("access token이 없으면 Authorization 없이 요청을 보낸다", async () => {
    getAccessTokenMock.mockResolvedValue({ data: {} })
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
    expect(new Headers(init?.headers).has("authorization")).toBe(false)
  })

  it("HTTP 401 응답을 받으면 세션 정리 후 HttpStatusError로 변환한다", async () => {
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
    expect(signOutMock).toHaveBeenCalledOnce()
  })
})
