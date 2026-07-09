import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { MainPostCarouselWidget } from "@/features/post/components/main-post-carousel-widget/main-post-carousel-widget"

const llmPost = {
  id: "9d68f1d4-514f-4f37-8a73-8ed43a15eb11",
  title: "AI 채용 트렌드",
  summary: "AI 채용 시장을 분석한 리포트입니다.",
  thumbnailUrl: null,
  sourceType: "LLM_REPORT" as const,
  createdAt: "2026-06-21T10:00:00Z",
}

describe("MainPostCarouselWidget", () => {
  it("LLM_REPORT를 AI 칼럼 배지로 표시한다", () => {
    render(
      <MainPostCarouselWidget
        posts={[llmPost]}
        isLoading={false}
        error={null}
        onPostClick={vi.fn()}
      />
    )

    expect(screen.getByText("AI 칼럼")).toBeInTheDocument()
    expect(screen.getByText(llmPost.title)).toBeInTheDocument()
    expect(screen.getByText(llmPost.summary)).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: `${llmPost.title} 게시글 보기`,
      })
    ).toHaveTextContent("칼럼 보기")
  })

  it("posts가 5개 이상이어도 4개만 렌더링한다", () => {
    const posts = Array.from({ length: 5 }).map((_, index) => ({
      ...llmPost,
      id: `9d68f1d4-514f-4f37-8a73-8ed43a15eb1${index}`,
      title: `AI 칼럼 ${index + 1}`,
    }))

    render(
      <MainPostCarouselWidget posts={posts} isLoading={false} error={null} />
    )

    expect(screen.getAllByRole("article")).toHaveLength(4)
    expect(screen.getByText("AI 칼럼 4")).toBeInTheDocument()
    expect(screen.queryByText("AI 칼럼 5")).not.toBeInTheDocument()
  })

  it("thumbnailUrl이 있어도 이미지를 렌더링하지 않는다", () => {
    render(
      <MainPostCarouselWidget
        posts={[
          {
            ...llmPost,
            thumbnailUrl: "https://example.com/thumbnail.png",
          },
        ]}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.queryByRole("img")).not.toBeInTheDocument()
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
      screen.getByText("아직 표시할 AI 칼럼이 없습니다.")
    ).toBeInTheDocument()
    expect(
      screen.getByText("새로운 AI 칼럼이 발행되면 여기에 표시됩니다.")
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

  it("onPostClick이 없으면 동작 버튼을 표시하지 않는다", () => {
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

  it("mock post는 예시 배지를 표시한다", () => {
    render(
      <MainPostCarouselWidget
        posts={[
          {
            ...llmPost,
            id: "00000000-0000-4000-8000-000000000001",
          },
        ]}
        isLoading={false}
        error={null}
      />
    )

    expect(screen.getByText("예시")).toBeInTheDocument()
    expect(screen.queryByText("AI 칼럼")).not.toBeInTheDocument()
  })
})
