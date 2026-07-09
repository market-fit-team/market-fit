import Image from "next/image"
import Link from "next/link"
import { HeaderAuthButton } from "@/features/auth/components/header/header-auth-button"
import {
  HeaderNavButton,
  type HeaderNavButtonProps,
} from "@/shared/components/layout/header-nav-button"
import { ThemeToggle } from "@/shared/components/theme-toggle"

const NAV_ITEMS: HeaderNavButtonProps[] = [
  {
    label: "홈",
    href: "/",
  },
  {
    label: "성향분석",
    href: "/onboarding",
  },
  {
    label: "상권지도",
    href: "/map",
  },
  {
    label: "AI 에이전트",
    href: "/chat",
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2.5">
                <Image
                  src="/logo.svg"
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0"
                />
                <span className="text-lg font-bold tracking-tight">
                  어디가게
                </span>
              </Link>
            </div>

            <nav className="flex items-center gap-1 sm:gap-2">
              {NAV_ITEMS.map((item) => {
                return <HeaderNavButton key={item.href} {...item} />
              })}
            </nav>

            <div className="flex items-center gap-2">
              <HeaderAuthButton />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="w-full border-t border-border bg-background py-8">
        <div className="mx-auto flex max-w-7xl items-center px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© 2026 어디가게. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
