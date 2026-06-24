import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HeaderAuthButton } from "@/features/auth/components/header/header-auth-button"
import { HeaderAuthButtonFallback } from "@/features/auth/components/header/header-auth-button-fallback"
import { HeaderAuthLoginButton } from "@/features/auth/components/header/header-auth-login-button"
import { HeaderAuthLogoutButton } from "@/features/auth/components/header/header-auth-logout-button"

const {
  queryClientClearMock,
  replaceMock,
  signOutMock,
  usePathnameMock,
  useSessionMock,
} = vi.hoisted(() => {
  return {
    queryClientClearMock: vi.fn(),
    replaceMock: vi.fn(),
    signOutMock: vi.fn(),
    usePathnameMock: vi.fn(),
    useSessionMock: vi.fn(),
  }
})

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}))

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>()
  return {
    ...actual,
    useQueryClient: () => ({
      clear: queryClientClearMock,
    }),
  }
})

vi.mock("@/features/auth/lib/auth-client", () => ({
  signOut: signOutMock,
  useSession: useSessionMock,
}))

describe("Header auth buttons", () => {
  beforeEach(() => {
    queryClientClearMock.mockReset()
    replaceMock.mockReset()
    signOutMock.mockReset()
    usePathnameMock.mockReset()
    useSessionMock.mockReset()
    usePathnameMock.mockReturnValue("/map")
    useSessionMock.mockReturnValue({
      data: null,
      isPending: false,
    })
  })

  it("현재 경로를 콜백 URL로 갖는 로그인 링크를 렌더링한다", () => {
    render(<HeaderAuthLoginButton />)

    expect(screen.getByRole("link", { name: "로그인" })).toHaveAttribute(
      "href",
      "/login?callbackURL=%2Fmap"
    )
  })

  it("이전 스피너 대신 스켈레톤 폴백을 렌더링한다", () => {
    const { container } = render(<HeaderAuthButtonFallback />)

    expect(container.firstChild).toHaveAttribute("data-slot", "skeleton")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("사용자를 로그아웃시키고 루트로 리다이렉트한다", async () => {
    signOutMock.mockImplementation(
      async (options?: { fetchOptions?: { onSuccess?: () => void } }) => {
        options?.fetchOptions?.onSuccess?.()
      }
    )

    render(<HeaderAuthLogoutButton avatarSeed="default" userName="홍길동" />)

    await userEvent.click(screen.getByRole("button", { name: "홍길동 메뉴" }))
    expect(signOutMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("menuitem", { name: "로그아웃" }))

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
    expect(queryClientClearMock).toHaveBeenCalled()
    expect(replaceMock).toHaveBeenCalledWith("/")
  })

  it("세션이 없을 때 로그인 버튼을 렌더링한다", () => {
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

  it("클라이언트 세션이 로딩되는 동안 폴백을 렌더링한다", () => {
    useSessionMock.mockReturnValue({
      data: null,
      isPending: true,
    })

    const { container } = render(<HeaderAuthButton />)

    expect(container.firstChild).toHaveAttribute("data-slot", "skeleton")
  })

  it("세션이 존재할 때 로그아웃 버튼을 렌더링한다", () => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          avatarSeed: "default",
          displayName: "홍길동",
          name: "홍길동",
        },
      },
      isPending: false,
    })

    render(<HeaderAuthButton />)

    expect(screen.getByRole("button", { name: "홍길동 메뉴" })).toHaveAttribute(
      "title",
      "홍길동"
    )
  })
})
