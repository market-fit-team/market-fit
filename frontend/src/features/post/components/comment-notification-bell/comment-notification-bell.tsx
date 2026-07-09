"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { useSession } from "@/features/auth/lib/auth-client"
import {
  getNotifications,
  markNotificationRead,
} from "@/features/post/api/post-api"
import type { PostNotification } from "@/features/post/types/post"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

type CommentNotificationBellProps = {
  onOpenPost?: (postId: string) => void
}

export function CommentNotificationBell({
  onOpenPost,
}: CommentNotificationBellProps) {
  const { data: session, isPending } = useSession()
  const [notifications, setNotifications] = useState<PostNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPending || !session) return null

  const unreadCount = notifications.filter(
    (notification) => !notification.read
  ).length

  const loadNotifications = async () => {
    setIsLoading(true)
    setError(null)
    try {
      setNotifications(await getNotifications())
    } catch {
      setError("알림을 불러오지 못했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open) void loadNotifications()
  }

  const handleNotificationSelect = async (notification: PostNotification) => {
    if (!notification.read) {
      try {
        const readNotification = await markNotificationRead(notification.id)
        setNotifications((current) =>
          current.map((item) =>
            item.id === readNotification.id ? readNotification : item
          )
        )
      } catch {
        setError("알림을 읽음 처리하지 못했습니다.")
      }
    }

    if (notification.targetPostId) {
      onOpenPost?.(notification.targetPostId)
    }
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="댓글 알림"
          className="relative"
        >
          <Bell aria-hidden="true" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>댓글 알림</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled>불러오는 중입니다.</DropdownMenuItem>
        ) : error ? (
          <DropdownMenuItem disabled>{error}</DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem disabled>알림이 없습니다.</DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="flex cursor-pointer flex-col items-start gap-1 py-2"
              onSelect={() => void handleNotificationSelect(notification)}
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">{notification.title}</span>
                {!notification.read ? (
                  <span className="size-2 rounded-full bg-red-600" />
                ) : null}
              </span>
              <span className="line-clamp-2 text-xs text-neutral-500">
                {notification.message}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
