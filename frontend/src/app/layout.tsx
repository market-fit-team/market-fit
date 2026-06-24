// src/app/layout.tsx
import { AppShell } from "@/shared/components/layout/app-shell"
import { Toaster } from "@/shared/components/ui/sonner"
import "./globals.css"
import { Providers } from "./providers"

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
