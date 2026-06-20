import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeaderAuthButton } from "@/features/auth/components/header/header-auth-button"
import { HeaderAuthButtonFallback } from "@/features/auth/components/header/header-auth-button-fallback"
import { HeaderAuthLoginButton } from "@/features/auth/components/header/header-auth-login-button"
import { HeaderAuthLogoutButton } from "@/features/auth/components/header/header-auth-logout-button"

const { pushMock, signOutMock, usePathnameMock, useSessionMock } = vi.hoisted(
  () => {
    return {
      pushMock: vi.fn(),
      signOutMock: vi.fn(),
      usePathnameMock: vi.fn(),
      useSessionMock: vi.fn(),
    }
  }
)

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  signOut: signOutMock,
  useSession: useSessionMock,
}))

describe("Header auth buttons", () => {
  beforeEach(() => {
    pushMock.mockReset()
    signOutMock.mockReset()
    usePathnameMock.mockReset()
    useSessionMock.mockReset()
    usePathnameMock.mockReturnValue("/map")
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
    })
  })

  it("renders a login link with the current pathname as callbackURL", () => {
    render(<HeaderAuthLoginButton />)

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fmap"
    )
  })

  it("renders a skeleton fallback instead of the old spinner", () => {
    const { container } = render(<HeaderAuthButtonFallback />)

    expect(container.firstChild).toHaveAttribute("data-slot", "skeleton")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("signs the user out and redirects to root", async () => {
    signOutMock.mockImplementation(
      async (options?: { fetchOptions?: { onSuccess?: () => void } }) => {
        options?.fetchOptions?.onSuccess?.()
      }
    )

    render(<HeaderAuthLogoutButton userName="홍길동" />)

    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }))
    expect(signOutMock).not.toHaveBeenCalled()

    const alertDialog = screen.getByRole("alertdialog", {
      name: "로그아웃 하시겠습니까?",
    })

    await userEvent.click(
      within(alertDialog).getByRole("button", { name: "로그아웃" })
    )

    expect(signOutMock).toHaveBeenCalledWith({
      fetchOptions: {
        onSuccess: expect.any(Function),
      },
    })
    expect(pushMock).toHaveBeenCalledWith("/")
  })

  it("renders the login button when the session is missing", () => {
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
    })

    render(<HeaderAuthButton />)

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fmap"
    )
  })

  it("renders the fallback while the client session is loading", () => {
    useSessionMock.mockReturnValue({
      data: null,
      isPending: true,
    })

    const { container } = render(<HeaderAuthButton />)

    expect(container.firstChild).toHaveAttribute("data-slot", "skeleton")
  })

  it("renders the logout button when the session exists", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          name: "홍길동",
        },
      },
      isPending: false,
    })

    render(<HeaderAuthButton />)

    expect(screen.getByRole("button", { name: "로그아웃" })).toHaveAttribute(
      "title",
      "홍길동"
    )
  })
})
