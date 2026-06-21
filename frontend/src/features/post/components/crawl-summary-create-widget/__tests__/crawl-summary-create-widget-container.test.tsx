import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createCrawlSummaryPost } from "@/features/post/api/create-crawl-summary-post"
import { CrawlSummaryCreateWidgetContainer } from "@/features/post/components/crawl-summary-create-widget/crawl-summary-create-widget-container"

vi.mock("@/features/post/api/create-crawl-summary-post", () => ({
  createCrawlSummaryPost: vi.fn(),
}))

describe("CrawlSummaryCreateWidgetContainer", () => {
  beforeEach(() => {
    vi.mocked(createCrawlSummaryPost).mockReset()
  })

  it("URL과 원문이 모두 비어 있으면 안내한다", async () => {
    render(<CrawlSummaryCreateWidgetContainer />)

    await userEvent.click(
      screen.getByRole("button", { name: "AI 리포트 생성" })
    )

    expect(
      screen.getByText("URL 또는 원문 중 하나를 입력해주세요.")
    ).toBeInTheDocument()
    expect(createCrawlSummaryPost).not.toHaveBeenCalled()
  })

  it("잘못된 URL 형식을 안내한다", async () => {
    render(<CrawlSummaryCreateWidgetContainer />)

    await userEvent.type(screen.getByLabelText("URL"), "not-a-url")
    await userEvent.click(
      screen.getByRole("button", { name: "AI 리포트 생성" })
    )

    expect(
      screen.getByText("올바른 URL 형식을 입력해주세요.")
    ).toBeInTheDocument()
  })

  it("너무 짧은 원문을 안내한다", async () => {
    render(<CrawlSummaryCreateWidgetContainer />)

    await userEvent.type(screen.getByLabelText("원문"), "짧은 원문")
    await userEvent.click(
      screen.getByRole("button", { name: "AI 리포트 생성" })
    )

    expect(
      screen.getByText("원문은 최소 20자 이상 입력해주세요.")
    ).toBeInTheDocument()
  })

  it("URL을 입력해 제출한다", async () => {
    const post = createdPost()
    vi.mocked(createCrawlSummaryPost).mockResolvedValue(post)
    render(<CrawlSummaryCreateWidgetContainer />)

    await userEvent.type(
      screen.getByLabelText("URL"),
      "https://example.com/article"
    )
    await userEvent.click(
      screen.getByRole("button", { name: "AI 리포트 생성" })
    )

    await waitFor(() =>
      expect(createCrawlSummaryPost).toHaveBeenCalledWith({
        url: "https://example.com/article",
        keyword: null,
        rawContent: null,
        visibility: "PUBLIC",
      })
    )
  })

  it("rawContent를 입력해 제출한다", async () => {
    vi.mocked(createCrawlSummaryPost).mockResolvedValue(createdPost())
    render(<CrawlSummaryCreateWidgetContainer />)
    const rawContent =
      "실제 LLM 요약 요청에 전달할 수 있을 만큼 충분히 긴 테스트 원문입니다."

    await userEvent.type(screen.getByLabelText("원문"), rawContent)
    await userEvent.click(
      screen.getByRole("button", { name: "AI 리포트 생성" })
    )

    await waitFor(() =>
      expect(createCrawlSummaryPost).toHaveBeenCalledWith({
        url: null,
        keyword: null,
        rawContent,
        visibility: "PUBLIC",
      })
    )
  })

  it("생성 실패 시 오류 상태를 표시한다", async () => {
    vi.mocked(createCrawlSummaryPost).mockRejectedValue(
      new Error("LLM 요약에 실패했습니다.")
    )
    render(<CrawlSummaryCreateWidgetContainer />)

    await userEvent.type(
      screen.getByLabelText("URL"),
      "https://example.com/article"
    )
    await userEvent.click(
      screen.getByRole("button", { name: "AI 리포트 생성" })
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "LLM 요약에 실패했습니다."
    )
  })

  it("성공한 Post를 표시하고 onCreated를 호출한다", async () => {
    const onCreated = vi.fn()
    const post = {
      id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
      title: "AI 채용 트렌드 요약",
      summary: "최근 AI 인력 수요가 증가하고 있습니다.",
      thumbnailUrl: null,
      sourceType: "LLM_REPORT" as const,
      sourceId: "source-1",
      createdAt: "2026-06-21T10:00:00Z",
    }
    vi.mocked(createCrawlSummaryPost).mockResolvedValue(post)
    render(<CrawlSummaryCreateWidgetContainer onCreated={onCreated} />)

    await userEvent.type(
      screen.getByLabelText("원문"),
      "AI 채용 시장의 변화와 개발자 수요를 설명하는 충분히 긴 원문입니다."
    )
    await userEvent.type(screen.getByLabelText("키워드"), "AI 채용")
    await userEvent.click(
      screen.getByRole("button", { name: "AI 리포트 생성" })
    )

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(post))
    expect(screen.getByText(post.title)).toBeInTheDocument()
    expect(screen.getByText(post.summary)).toBeInTheDocument()
    expect(createCrawlSummaryPost).toHaveBeenCalledWith({
      url: null,
      keyword: "AI 채용",
      rawContent:
        "AI 채용 시장의 변화와 개발자 수요를 설명하는 충분히 긴 원문입니다.",
      visibility: "PUBLIC",
    })
  })
})

function createdPost() {
  return {
    id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
    title: "AI 채용 트렌드 요약",
    summary: "최근 AI 인력 수요가 증가하고 있습니다.",
    thumbnailUrl: null,
    sourceType: "LLM_REPORT" as const,
    sourceId: "source-1",
    createdAt: "2026-06-21T10:00:00Z",
  }
}
