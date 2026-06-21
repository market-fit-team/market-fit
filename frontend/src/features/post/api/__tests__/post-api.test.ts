import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchWithAuth } from "@/features/auth/lib/fetch-with-auth"
import {
  createLlmReport,
  getMainPostCarousel,
  getPosts,
} from "@/features/post/api/post-api"

vi.mock("@/features/auth/lib/fetch-with-auth", () => ({
  fetchWithAuth: vi.fn(),
}))

describe("post-api", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.mocked(fetchWithAuth).mockReset()
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

  it("rawContent를 포함한 LLM 리포트 생성 요청을 보낸다", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      id: "post-1",
      authorId: "user-1",
      authorName: "테스터",
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
})
