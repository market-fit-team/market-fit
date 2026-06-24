"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/shared/components/ui/button"

const getLoginHref = (pathname: string | null) => {
  const searchParams = new URLSearchParams({
    callbackURL: pathname ?? "/",
  })

  return `/login?${searchParams.toString()}`
}

export function HeaderAuthLoginButton() {
  const pathname = usePathname()

  return (
    <Button asChild variant="outline" size="lg" className="min-w-20 px-3.5">
      <Link href={getLoginHref(pathname)}>로그인</Link>
    </Button>
  )
}
