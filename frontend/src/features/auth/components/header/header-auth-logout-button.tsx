"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Avatar from "boring-avatars"
import { LogOut } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { signOut } from "@/features/auth/lib/auth-client"
import { clearClientSessionState } from "@/features/auth/lib/client-session-cleanup"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { avatarColors } from "@/shared/lib/boring-avatars"

type HeaderAuthLogoutButtonProps = {
  avatarSeed: string
  userName?: string | null
}

export function HeaderAuthLogoutButton({
  avatarSeed,
  userName,
}: HeaderAuthLogoutButtonProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const resolvedUserName = userName?.trim() || "내 계정"
  const avatarSize = 36

  return (
    <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="overflow-hidden rounded-full p-0"
            style={{ width: avatarSize, height: avatarSize }}
            title={resolvedUserName}
            aria-label={`${resolvedUserName} 메뉴`}
          >
            <Avatar
              className="size-full"
              colors={avatarColors}
              name={avatarSeed}
              size={avatarSize}
              variant="beam"
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/profile">프로필 수정</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/mypage">내 페이지</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isSigningOut}
            onSelect={() => {
              setIsLogoutDialogOpen(true)
            }}
          >
            <LogOut className="size-4" />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>로그아웃 하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            현재 세션이 종료되며 홈 화면으로 이동합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isSigningOut}
            onClick={async () => {
              if (isSigningOut) return

              setIsSigningOut(true)

              try {
                await signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      clearClientSessionState(queryClient)
                      setIsLogoutDialogOpen(false)
                      // Better Auth는 signOut의 fetchOptions.onSuccess에서 후속 이동을 지원한다.
                      // https://better-auth.com/docs/basic-usage#signout
                      router.replace("/")
                    },
                  },
                })
              } finally {
                setIsSigningOut(false)
              }
            }}
          >
            로그아웃
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
