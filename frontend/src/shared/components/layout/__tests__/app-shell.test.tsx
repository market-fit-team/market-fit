import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { AppShell } from "@/shared/components/layout/app-shell"

vi.mock("@/features/auth/components/header/header-auth-button", () => ({
  HeaderAuthButton: () => <div>HeaderAuthButton</div>,
}))

vi.mock(
  "@/features/auth/components/header/header-auth-button-fallback",
  () => ({
    HeaderAuthButtonFallback: () => <div>HeaderAuthButtonFallback</div>,
  })
)

vi.mock("@/shared/components/layout/header-nav-button", () => ({
  HeaderNavButton: ({ label }: { label: string }) => <div>{label}</div>,
}))

describe("AppShell", () => {
  it("기존의 프로필 링크 대신 헤더 인증 컨트롤을 렌더링한다", () => {
    render(
      <AppShell>
        <div>content</div>
      </AppShell>
    )

    expect(screen.getByText("HeaderAuthButton")).toBeInTheDocument()
    expect(screen.queryByText("User Profile")).not.toBeInTheDocument()
  })
})
