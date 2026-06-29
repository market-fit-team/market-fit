import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { getPost } from "@/features/post/api/post-api"
import { MainPostCarouselWidgetContainer } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget-container"
import { useCommentNotifications } from "@/features/post/hooks/use-comment-notifications"
import { useMainPosts } from "@/features/post/hooks/use-main-posts"

vi.mock("@/features/post/hooks/use-main-posts", () => ({
  useMainPosts: vi.fn(),
}))

vi.mock("@/features/post/hooks/use-comment-notifications", () => ({
  useCommentNotifications: vi.fn(),
}))

vi.mock("@/features/post/components/post-comments/post-comments", () => ({
  PostComments: ({ postId }: { postId: string }) => (
    <div data-testid="post-comments">{postId}</div>
  ),
}))

vi.mock(
  "@/features/post/components/comment-notification-bell/comment-notification-bell",
  () => ({
    CommentNotificationBell: () => <div data-testid="notification-bell" />,
  })
)

vi.mock(
  "@/features/post/components/public-post-report-bell/public-post-report-bell",
  () => ({
    PublicPostReportBell: () => <div data-testid="public-notification-bell" />,
  })
)

vi.mock("@/features/post/api/post-api", () => ({
  getPost: vi.fn(),
}))

describe("MainPostCarouselWidgetContainer", () => {
  beforeEach(() => {
    vi.mocked(useMainPosts).mockReset()
    vi.mocked(useCommentNotifications).mockReset()
    vi.mocked(getPost).mockReset()
    vi.mocked(useMainPosts).mockReturnValue({
      posts: [],
      isLoading: false,
      error: null,
    })
  })

  it("칼럼 보기를 누르면 상세 창에 전문과 댓글 영역을 표시한다", async () => {
    vi.mocked(useMainPosts).mockReturnValue({
      posts: [
        {
          id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
          title: "AI 상권 리포트",
          summary: "요약입니다.",
          thumbnailUrl: null,
          sourceType: "LLM_REPORT",
          createdAt: "2026-06-21T10:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
    })
    vi.mocked(getPost).mockResolvedValue({
      id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
      userId: "user-1",
      authorId: "user-1",
      authorName: "user-1",
      title: "AI 상권 리포트",
      summary: "요약입니다.",
      content: "본문 1문단\n\n본문 2문단",
      category: "TREND",
      readTimeMinutes: 3,
      sourceType: "LLM_REPORT",
      sourceUrl: "https://example.com",
      llmProvider: "OPENAI:gpt-4o-mini",
      publishedAt: "2026-06-21T10:00:00Z",
      createdAt: "2026-06-21T10:00:00Z",
      updatedAt: "2026-06-21T10:00:00Z",
      sourceId: null,
      sourceTitle: null,
      collectedAt: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
    })

    render(<MainPostCarouselWidgetContainer />)

    fireEvent.click(
      screen.getByRole("button", { name: "AI 상권 리포트 게시글 보기" })
    )

    await waitFor(() =>
      expect(getPost).toHaveBeenCalledWith(
        "9d68f1d4-514f-4f37-8a73-8ed43a15eb11"
      )
    )
    expect(await screen.findByText(/본문 1문단\s+본문 2문단/)).toBeInTheDocument()
    expect(screen.getByTestId("post-comments")).toHaveTextContent(
      "9d68f1d4-514f-4f37-8a73-8ed43a15eb11"
    )
  })

  it("댓글 알림 훅을 연결한다", () => {
    render(<MainPostCarouselWidgetContainer />)

    expect(useCommentNotifications).toHaveBeenCalledWith({
      onOpenPost: expect.any(Function),
    })
  })

  it("AI 칼럼 생성 버튼을 표시하지 않는다", () => {
    render(<MainPostCarouselWidgetContainer />)

    expect(
      screen.queryByRole("button", { name: /AI 칼럼 생성/ })
    ).not.toBeInTheDocument()
    expect(screen.getByTestId("public-notification-bell")).toBeInTheDocument()
  })
})
