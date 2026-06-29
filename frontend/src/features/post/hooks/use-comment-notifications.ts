"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useSession } from "@/features/auth/lib/auth-client"
import { fetchWithAuthResponse } from "@/features/auth/lib/fetch-with-auth"
import type { PostNotification } from "@/features/post/types/post"

type UseCommentNotificationsOptions = {
  onOpenPost?: (postId: string) => void
}

const notificationEventsUrl = `${process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8088"}/api/post/api/notifications/events`
const COMMENT_NOTIFICATION_EVENT = "notification.created"
const RETRY_DELAY_MILLIS = 3_000

type SseBoundary = {
  index: number
  length: number
}

const parseNotification = (payload: string): PostNotification | null => {
  try {
    return JSON.parse(payload) as PostNotification
  } catch {
    return null
  }
}

const findSseBoundary = (buffer: string): SseBoundary | null => {
  const unixBoundary = buffer.indexOf("\n\n")
  const windowsBoundary = buffer.indexOf("\r\n\r\n")

  if (unixBoundary < 0 && windowsBoundary < 0) {
    return null
  }

  if (unixBoundary < 0) {
    return { index: windowsBoundary, length: 4 }
  }

  if (windowsBoundary < 0 || unixBoundary < windowsBoundary) {
    return { index: unixBoundary, length: 2 }
  }

  return { index: windowsBoundary, length: 4 }
}

const dispatchSseMessage = (
  rawMessage: string,
  onNotification: (notification: PostNotification) => void
) => {
  let eventName = "message"
  const dataLines: string[] = []

  for (const line of rawMessage.replace(/\r\n/g, "\n").split("\n")) {
    if (!line || line.startsWith(":")) continue

    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim()
      continue
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (eventName !== COMMENT_NOTIFICATION_EVENT || dataLines.length === 0) {
    return
  }

  const notification = parseNotification(dataLines.join("\n"))
  if (!notification) return

  onNotification(notification)
}

const consumeNotificationStream = async (
  stream: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onNotification: (notification: PostNotification) => void
) => {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read()

      if (done) break
      if (!value) continue

      buffer += decoder.decode(value, { stream: true })

      let boundary = findSseBoundary(buffer)
      while (boundary) {
        const rawMessage = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary.length)
        dispatchSseMessage(rawMessage, onNotification)
        boundary = findSseBoundary(buffer)
      }
    }
  } finally {
    void reader.cancel().catch(() => undefined)
  }
}

export function useCommentNotifications({
  onOpenPost,
}: UseCommentNotificationsOptions = {}) {
  const { data: session, isPending } = useSession()

  useEffect(() => {
    if (isPending || !session) {
      return
    }

    const controller = new AbortController()
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const connect = async () => {
      try {
        const response = await fetchWithAuthResponse(notificationEventsUrl, {
          signal: controller.signal,
          cache: "no-store",
          headers: {
            accept: "text/event-stream",
          },
        })

        if (!response.body) return

        await consumeNotificationStream(
          response.body,
          controller.signal,
          (notification) => {
            const targetPostId = notification.targetPostId

            toast.info(notification.title, {
              description: notification.message,
              action: targetPostId
                ? {
                    label: "보기",
                    onClick: () => onOpenPost?.(targetPostId),
                  }
                : undefined,
            })
          }
        )
      } catch {
        if (controller.signal.aborted) return
      } finally {
        if (controller.signal.aborted) return

        retryTimer = setTimeout(() => {
          void connect()
        }, RETRY_DELAY_MILLIS)
      }
    }

    void connect()

    return () => {
      controller.abort()
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
    }
  }, [isPending, onOpenPost, session])
}
