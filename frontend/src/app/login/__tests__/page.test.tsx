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

const createCompletedSession = () => {
  return {
    user: {
      id: "user-1",
      displayName: "홍길동1234",
      avatarSeed: "avatar-seed-1",
    },
    session: { id: "session-1" },
  }
}

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

  it("인증된 사용자를 유효한 콜백 URL로 리다이렉트한다", async () => {
    getServerSessionMock.mockResolvedValue(createCompletedSession())

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

  it("인증된 사용자를 잘못된 콜백 URL에 대해 루트로 리다이렉트한다", async () => {
    getServerSessionMock.mockResolvedValue(createCompletedSession())

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

  it("프로필 설정이 끝나지 않은 사용자를 프로필 페이지로 리다이렉트한다", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        id: "user-1",
        displayName: "default",
        avatarSeed: "default",
      },
      session: { id: "session-1" },
    })

    await expect(
      LoginPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({
          callbackURL: "/example/dashboard",
        }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/profile?callbackURL=%2Fexample%2Fdashboard")

    expect(redirectMock).toHaveBeenCalledWith(
      "/profile?callbackURL=%2Fexample%2Fdashboard"
    )
  })

  it("인증되지 않은 사용자에게 로그인 카드를 렌더링한다", async () => {
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
