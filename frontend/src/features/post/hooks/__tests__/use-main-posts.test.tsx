import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { getMainPosts } from "@/features/post/api/get-main-posts"
import { useMainPosts } from "@/features/post/hooks/use-main-posts"

vi.mock("@/features/post/api/get-main-posts", () => ({
  getMainPosts: vi.fn(),
}))

describe("useMainPosts", () => {
  beforeEach(() => {
    vi.mocked(getMainPosts).mockReset()
  })

  it("지정한 limit으로 Post를 조회한다", async () => {
    const posts = [
      {
        id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
        title: "AI 리포트",
        summary: "요약",
        thumbnailUrl: null,
        sourceType: "LLM_REPORT" as const,
        createdAt: "2026-06-21T10:00:00Z",
      },
    ]
    vi.mocked(getMainPosts).mockResolvedValue(posts)

    const { result } = renderHook(() => useMainPosts(7))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.posts).toEqual(posts)
    expect(result.current.error).toBeNull()
    expect(getMainPosts).toHaveBeenCalledWith(7, expect.any(AbortSignal))
  })

  it("조회 오류 메시지를 반환한다", async () => {
    vi.mocked(getMainPosts).mockRejectedValue(new Error("조회 실패"))

    const { result } = renderHook(() => useMainPosts())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.posts).toEqual([])
    expect(result.current.error).toBe("조회 실패")
  })

  it("새 공개 리포트 이벤트를 받으면 main 목록을 다시 조회한다", async () => {
    vi.mocked(getMainPosts).mockResolvedValue([])
    renderHook(() => useMainPosts())
    await waitFor(() => expect(getMainPosts).toHaveBeenCalledTimes(1))

    act(() => {
      window.dispatchEvent(new Event("public-post-report-created"))
    })

    await waitFor(() => expect(getMainPosts).toHaveBeenCalledTimes(2))
  })
})
