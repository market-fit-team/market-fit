// src/app/layout.tsx
import Link from "next/link"
import UserNav from "@/features/auth/components/user-nav"
import { Providers } from "./providers"
import "./globals.css"

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <div>
            <UserNav />
          </div>
          <nav>
            <Link href="/community/posts">커뮤니티 게시판</Link>
            <Link href="/community/scheduled-posts">예약 게시글 작성</Link>
          </nav>
          <div>{children}</div>
        </Providers>
      </body>
    </html>
  )
}
