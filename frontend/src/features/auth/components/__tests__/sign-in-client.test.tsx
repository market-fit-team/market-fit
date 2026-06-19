import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SignInClient from "@/features/auth/components/sign-in-client"

const { oauth2Mock } = vi.hoisted(() => {
  return {
    oauth2Mock: vi.fn(),
  }
})

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    signIn: {
      oauth2: oauth2Mock,
    },
  },
}))

describe("SignInClient", () => {
  beforeEach(() => {
    oauth2Mock.mockReset()
  })

  it("calls Better Auth oauth2 sign-in with the authentik provider payload", async () => {
    oauth2Mock.mockResolvedValue(undefined)

    render(<SignInClient callbackURL="/example/dashboard" />)

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    )

    expect(oauth2Mock).toHaveBeenCalledWith({
      providerId: "authentik",
      callbackURL: "/example/dashboard",
      errorCallbackURL: "/login?callbackURL=%2Fexample%2Fdashboard&error=oauth",
      scopes: ["openid", "profile", "email"],
    })
  })

  it("blocks duplicate clicks while sign-in is pending", async () => {
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

  it("shows the oauth error message from the callback", () => {
    render(<SignInClient callbackURL="/" error="oauth" />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "로그인을 완료하지 못했습니다. 다시 시도해 주세요."
    )
  })
})
