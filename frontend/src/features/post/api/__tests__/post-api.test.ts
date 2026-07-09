import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  fetchWithAuth,
  getClientOidcAccessToken,
} from "@/features/auth/lib/fetch-with-auth"
import {
  createLlmReport,
  createPost,
  createPostComment,
  deletePostComment,
  getMainPostCarousel,
  getNotifications,
  getPost,
  getPostComments,
  getPosts,
  markNotificationRead,
  updatePost,
  updatePostComment,
} from "@/features/post/api/post-api"

vi.mock("@/features/auth/lib/fetch-with-auth", () => ({
  fetchWithAuth: vi.fn(),
  getClientOidcAccessToken: vi.fn(),
}))

describe("post-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(fetchWithAuth).mockReset()
    vi.mocked(getClientOidcAccessToken).mockReset()
  })

  it("메인 캐러셀 응답을 반환한다", async () => {
    const sections = [{ id: "trend", posts: [] }]
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(sections), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    )

    await expect(getMainPostCarousel()).resolves.toEqual(sections)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/post/api/posts/main"),
      { next: { revalidate: 60 } }
    )
  })

  it("게시글 페이지 요청에 page와 size를 포함한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: [], last: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await getPosts(2, 10)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("?page=2&size=10"),
      { cache: "no-store" }
    )
  })

  it("게시글 상세를 공개 GET 경로로 조회한다", async () => {
    const post = {
      id: "post-1",
      title: "리포트",
      content: "전문",
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(post), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(getPost("post-1")).resolves.toEqual(post)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/post/api/posts/post-1"),
      { cache: "no-store" }
    )
  })

  it("rawContent를 포함한 LLM 리포트 생성 요청을 보낸다", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      id: "post-1",
      authorId: "user-1",
      authorName: "테스트",
      title: "리포트",
      summary: "요약",
      content: "본문",
      category: "TREND",
      readTimeMinutes: 3,
      sourceType: "LLM_REPORT",
      sourceUrl: "https://example.com/article",
      sourceTitle: null,
      collectedAt: "2026-06-21T00:00:00Z",
      llmProvider: "mock-v1",
      publishedAt: "2026-06-21T00:00:00Z",
      createdAt: "2026-06-21T00:00:00Z",
      updatedAt: "2026-06-21T00:00:00Z",
    })

    await createLlmReport({
      url: "https://example.com/article",
      rawContent: "수집 원문",
      category: "TREND",
    })

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/post-reports"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          url: "https://example.com/article",
          rawContent: "수집 원문",
          category: "TREND",
        }),
      })
    )
  })

  it("Post 생성과 수정은 통합 CRUD 경로를 사용한다", async () => {
    const input = {
      title: "제목",
      summary: "요약",
      content: "본문",
      category: "TREND" as const,
      readTimeMinutes: 1,
    }
    vi.mocked(fetchWithAuth).mockResolvedValue({} as never)

    await createPost(input)
    await updatePost("post-1", input)

    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/post/api/posts"),
      expect.objectContaining({ method: "POST" })
    )
    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/post/api/posts/post-1"),
      expect.objectContaining({ method: "PATCH" })
    )
  })

  it("댓글 목록 조회는 토큰이 있으면 함께 보내고 공개 경로로 요청한다", async () => {
    vi.mocked(getClientOidcAccessToken).mockResolvedValue("token-1")
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await getPostComments("post-1")

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/post/api/posts/post-1/comments"),
      expect.objectContaining({
        cache: "no-store",
        headers: expect.any(Headers),
      })
    )
    expect(
      (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers
    ).toEqual(
      expect.objectContaining({
        get: expect.any(Function),
      })
    )
    expect(
      (
        (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)
          ?.headers as Headers
      ).get("authorization")
    ).toBe("Bearer token-1")
  })

  it("댓글 작성/수정/삭제는 인증 경로를 사용한다", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({} as never)

    await createPostComment("post-1", "댓글")
    await updatePostComment("post-1", "comment-1", "수정 댓글")
    await deletePostComment("post-1", "comment-1")

    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/post/api/posts/post-1/comments"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "댓글" }),
      })
    )
    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/post/api/posts/post-1/comments/comment-1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ content: "수정 댓글" }),
      })
    )
    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("/api/post/api/posts/post-1/comments/comment-1"),
      expect.objectContaining({ method: "DELETE" })
    )
  })

  it("알림 조회와 읽음 처리 API 경로를 사용한다", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({} as never)

    await getNotifications()
    await markNotificationRead("notification-1")

    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/post/api/notifications")
    )
    expect(fetchWithAuth).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        "/api/post/api/notifications/notification-1/read"
      ),
      expect.objectContaining({ method: "PATCH" })
    )
  })
})
