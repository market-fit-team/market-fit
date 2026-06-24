"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

export type HeaderNavButtonProps = {
  href: string
  label: string
}

export function HeaderNavButton({ href, label }: HeaderNavButtonProps) {
  const pathname = usePathname()
  const active = href === "/" ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({
          variant: active ? "secondary" : "ghost",
          size: "lg",
        }),
        "px-3"
      )}
    >
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}
