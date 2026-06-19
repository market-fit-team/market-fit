import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import LoginPage from "@/app/login/page"

const { getServerSessionMock, redirectMock, oauth2Mock } = vi.hoisted(() => {
  return {
    getServerSessionMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    }),
    oauth2Mock: vi.fn(),
  }
})

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

vi.mock("@/features/auth/lib/server-session", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    signIn: {
      oauth2: oauth2Mock,
    },
  },
}))

describe("/login page", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset()
    redirectMock.mockClear()
    oauth2Mock.mockReset()
  })

  it("redirects an authenticated user to a valid callback URL", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "session-1" },
    })

    await expect(
      LoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          callbackURL: "/example/dashboard",
        }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/example/dashboard")

    expect(redirectMock).toHaveBeenCalledWith("/example/dashboard")
  })

  it("redirects an authenticated user to root for an invalid callback URL", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "session-1" },
    })

    await expect(
      LoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          callbackURL: "https://example.com/dashboard",
        }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/")

    expect(redirectMock).toHaveBeenCalledWith("/")
  })

  it("renders the login card for an unauthenticated user", async () => {
    getServerSessionMock.mockResolvedValue(null)

    const page = await LoginPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve({
        callbackURL: "/example/dashboard",
      }),
    })

    render(page)

    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument()
    expect(screen.getByText("로그인")).toBeInTheDocument()
  })
})
