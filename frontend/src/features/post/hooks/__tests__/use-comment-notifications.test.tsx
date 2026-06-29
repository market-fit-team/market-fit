import { renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useCommentNotifications } from "@/features/post/hooks/use-comment-notifications"

const { toastInfo } = vi.hoisted(() => ({
  toastInfo: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: {
    info: toastInfo,
  },
}))

vi.mock("@/features/auth/lib/auth-client", () => ({
  useSession: vi.fn(),
}))

vi.mock("@/features/auth/lib/fetch-with-auth", () => ({
  fetchWithAuthResponse: vi.fn(),
}))

const createSseResponse = (body: string) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(body))
        controller.close()
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
      },
    }
  )

describe("useCommentNotifications", () => {
  beforeEach(async () => {
    const { useSession } = await import("@/features/auth/lib/auth-client")
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1" } },
      isPending: false,
    } as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("Authorization 헤더 기반 SSE를 구독하고 댓글 알림을 처리한다", async () => {
    const onOpenPost = vi.fn()
    const { fetchWithAuthResponse } = await import(
      "@/features/auth/lib/fetch-with-auth"
    )
    vi.mocked(fetchWithAuthResponse).mockResolvedValue(
      createSseResponse(
        'event: notification.created\ndata: {"id":"notification-1","type":"COMMENT_CREATED","title":"댓글 알림","message":"새 댓글이 등록되었습니다.","targetPostId":"post-1","targetCommentId":"comment-1","read":false,"createdAt":"2026-06-29T00:00:00Z"}\n\n'
      )
    )

    const { unmount } = renderHook(() =>
      useCommentNotifications({ onOpenPost })
    )

    await waitFor(() =>
      expect(fetchWithAuthResponse).toHaveBeenCalledWith(
        expect.stringContaining("/api/post/api/notifications/events"),
        expect.objectContaining({
          cache: "no-store",
          headers: {
            accept: "text/event-stream",
          },
          signal: expect.any(AbortSignal),
        })
      )
    )

    await waitFor(() =>
      expect(toastInfo).toHaveBeenCalledWith(
        "댓글 알림",
        expect.objectContaining({
          description: "새 댓글이 등록되었습니다.",
          action: expect.objectContaining({
            label: "보기",
            onClick: expect.any(Function),
          }),
        })
      )
    )

    const toastAction = toastInfo.mock.calls[0]?.[1]?.action
    toastAction?.onClick()
    expect(onOpenPost).toHaveBeenCalledWith("post-1")

    unmount()
  })
})
