import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SignInClient from "@/features/auth/components/sign-in-client"

const { oauth2Mock, toastErrorMock } = vi.hoisted(() => {
  return {
    oauth2Mock: vi.fn(),
    toastErrorMock: vi.fn(),
  }
})

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    signIn: {
      oauth2: oauth2Mock,
    },
  },
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastErrorMock,
  },
}))

describe("SignInClient", () => {
  beforeEach(() => {
    oauth2Mock.mockReset()
    toastErrorMock.mockReset()
  })

  it("authentik 제공자 페이로드와 함께 Better Auth oauth2 로그인을 호출한다", async () => {
    oauth2Mock.mockResolvedValue(undefined)

    render(<SignInClient callbackURL="/example/dashboard" />)

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    )

    expect(oauth2Mock).toHaveBeenCalledWith({
      providerId: "authentik",
      callbackURL: "/login?callbackURL=%2Fexample%2Fdashboard",
      errorCallbackURL: "/login?callbackURL=%2Fexample%2Fdashboard&error=oauth",
      scopes: ["openid", "profile", "email", "user_profile", "offline_access"],
    })
  })

  it("로그인이 대기 중일 때 중복 클릭을 차단한다", async () => {
    let resolveRequest: (() => void) | undefined
    oauth2Mock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve
        })
    )

    render(<SignInClient callbackURL="/example/dashboard" />)

    const user = userEvent.setup()
    const button = screen.getByRole("button", {
      name: /continue with google/i,
    })

    await user.click(button)
    expect(button).toBeDisabled()

    await user.click(button)
    expect(oauth2Mock).toHaveBeenCalledTimes(1)

    resolveRequest?.()

    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })

  it("콜백에서 발생한 oauth 에러 토스트를 띄운다", async () => {
    render(<SignInClient callbackURL="/" error="oauth" />)

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "로그인을 완료하지 못했습니다.",
        {
          description: "잠시 후 다시 시도해주시기 바랍니다",
        }
      )
    })
  })
})
