import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchWithAuth } from "@/features/auth/lib/fetch-with-auth"
import { createCrawlSummaryPost } from "@/features/post/api/create-crawl-summary-post"

vi.mock("@/features/auth/lib/fetch-with-auth", () => ({
  fetchWithAuth: vi.fn(),
}))

describe("createCrawlSummaryPost", () => {
  beforeEach(() => {
    vi.mocked(fetchWithAuth).mockReset()
  })

  it("crawl-summary API에 nullable 필드를 포함한 요청을 보낸다", async () => {
    vi.mocked(fetchWithAuth).mockResolvedValue({
      id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
      title: "AI 리포트",
      summary: "요약",
      thumbnailUrl: null,
      sourceType: "LLM_REPORT",
      sourceId: "source-1",
      createdAt: "2026-06-21T10:00:00Z",
    })
    const input = {
      url: "https://example.com/article",
      keyword: null,
      rawContent: null,
      visibility: "PUBLIC" as const,
    }

    await createCrawlSummaryPost(input)

    expect(fetchWithAuth).toHaveBeenCalledWith(
      expect.stringContaining("/api/post/api/posts/crawl-summary"),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      }
    )
  })
})
