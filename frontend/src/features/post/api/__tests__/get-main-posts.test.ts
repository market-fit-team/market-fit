import { beforeEach, describe, expect, it, vi } from "vitest"
import { getMainPosts } from "@/features/post/api/get-main-posts"

describe("getMainPosts", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("limit을 포함해 메인 Post를 조회한다", async () => {
    const posts = [
      {
        id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
        title: "AI 리포트",
        summary: "요약",
        thumbnailUrl: null,
        sourceType: "LLM_REPORT",
        createdAt: "2026-06-21T10:00:00Z",
      },
    ]
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(posts), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await expect(getMainPosts(7)).resolves.toEqual(posts)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/post/api/posts/main?limit=7"),
      expect.objectContaining({ method: "GET" })
    )
  })

  it("limit을 최대 20으로 제한한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    vi.stubGlobal("fetch", fetchMock)

    await getMainPosts(100)

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("?limit=20"),
      expect.any(Object)
    )
  })

  it("실패 응답의 detail을 오류로 반환한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: "조회 실패" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        })
      )
    )

    await expect(getMainPosts()).rejects.toThrow("조회 실패")
  })
})
