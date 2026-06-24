import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MainPostCarouselWidget } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget"

vi.mock("@/shared/components/ui/carousel", () => ({
  Carousel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  CarouselContent: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
  CarouselItem: ({ children }: React.PropsWithChildren) => (
    <div>{children}</div>
  ),
  CarouselPrevious: () => <button type="button">이전</button>,
  CarouselNext: () => <button type="button">다음</button>,
}))

const llmPost = {
  id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
  title: "AI 채용 트렌드",
  summary: "AI 채용 시장을 분석한 리포트입니다.",
  thumbnailUrl: null,
  sourceType: "LLM_REPORT" as const,
  createdAt: "2026-06-21T10:00:00Z",
}

describe("MainPostCarouselWidget", () => {
  it("LLM_REPORT를 AI 리포트 히어로 슬라이드로 표시한다", () => {
    render(
      <MainPostCarouselWidget
        posts={[llmPost]}
        isLoading={false}
        error={null}
        onPostClick={vi.fn()}
      />
    )

    expect(screen.getByText("AI 리포트")).toBeInTheDocument()
    expect(screen.getByText(llmPost.title)).toBeInTheDocument()
    expect(screen.getByText(llmPost.summary)).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: `${llmPost.title} 게시글 보기`,
      })
    ).toHaveTextContent("리포트 보기")
    expect(
      screen.getByLabelText(`${llmPost.title} 썸네일 없음`)
    ).toBeInTheDocument()
  })

  it("loading 상태를 표시한다", () => {
    render(
      <MainPostCarouselWidget
        posts={[]}
        isLoading
        error={null}
        onPostClick={vi.fn()}
      />
    )

    expect(
      screen.getByRole("status", { name: "게시글을 불러오는 중" })
    ).toBeInTheDocument()
  })

  it("empty 상태를 표시한다", () => {
    render(
      <MainPostCarouselWidget
        posts={[]}
        isLoading={false}
        error={null}
        onPostClick={vi.fn()}
      />
    )

    expect(
      screen.getByText("아직 등록된 리포트가 없습니다.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("새로운 AI 분석 리포트가 발행되면 이곳에 표시됩니다.")
    ).toBeInTheDocument()
  })

  it("error 상태를 표시한다", () => {
    render(
      <MainPostCarouselWidget
        posts={[]}
        isLoading={false}
        error="리포트를 불러오지 못했습니다."
        onPostClick={vi.fn()}
      />
    )

    expect(screen.getByRole("alert")).toHaveTextContent(
      "리포트를 불러오지 못했습니다."
    )
  })

  it("카드 클릭 시 onPostClick을 호출한다", () => {
    const onPostClick = vi.fn()
    render(
      <MainPostCarouselWidget
        posts={[llmPost]}
        isLoading={false}
        error={null}
        onPostClick={onPostClick}
      />
    )

    fireEvent.click(
      screen.getByRole("button", {
        name: `${llmPost.title} 게시글 보기`,
      })
    )

    expect(onPostClick).toHaveBeenCalledWith(llmPost.id)
  })

  it("onPostClick이 없으면 동작하지 않는 CTA를 표시하지 않는다", () => {
    render(
      <MainPostCarouselWidget
        posts={[llmPost]}
        isLoading={false}
        error={null}
      />
    )

    expect(
      screen.queryByRole("button", {
        name: `${llmPost.title} 게시글 보기`,
      })
    ).not.toBeInTheDocument()
  })
})
