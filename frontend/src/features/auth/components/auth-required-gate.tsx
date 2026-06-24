"use client"

import { type ReactNode, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useSession } from "@/features/auth/lib/auth-client"
import { normalizeCallbackURL } from "@/features/auth/lib/callback-url"

type AuthRequiredGateProps = {
  children: ReactNode
}

const buildCurrentCallbackURL = (
  pathname: string,
  searchParams: { toString: () => string }
) => {
  const queryString = searchParams.toString()
  return normalizeCallbackURL(
    queryString ? `${pathname}?${queryString}` : pathname
  )
}

const buildLoginHref = (callbackURL: string) => {
  const params = new URLSearchParams({ callbackURL })
  return `/login?${params.toString()}`
}

export function AuthRequiredGate({ children }: AuthRequiredGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (isPending || session) {
      return
    }

    router.replace(
      buildLoginHref(buildCurrentCallbackURL(pathname, searchParams))
    )
  }, [isPending, pathname, router, searchParams, session])

  if (isPending || !session) {
    return null
  }

  return <>{children}</>
}
