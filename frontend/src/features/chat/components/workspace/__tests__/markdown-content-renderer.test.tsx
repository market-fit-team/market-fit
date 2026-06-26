import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MarkdownContentRenderer } from "@/features/chat/components/workspace/markdown-content-renderer"

describe("MarkdownContentRenderer", () => {
  it("일반 마크다운을 렌더링한다.", () => {
    render(
      <MarkdownContentRenderer
        content={"## 제목\n\n**강조** 문장과 [링크](https://example.com)"}
      />
    )

    expect(screen.getByText("제목")).toBeInTheDocument()
    expect(screen.getByText("강조")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "링크" })).toHaveAttribute(
      "href",
      "https://example.com"
    )
  })

  it("bar chart fenced block을 차트로 렌더링한다.", () => {
    const { container } = render(
      <MarkdownContentRenderer
        content={`
\`\`\`chart
{
  "type": "bar",
  "title": "월별 매출",
  "description": "최근 3개월 매출 추이",
  "xKey": "month",
  "series": [{"key": "sales", "label": "매출"}],
  "data": [
    {"month": "1월", "sales": 120},
    {"month": "2월", "sales": 140}
  ]
}
\`\`\`
`}
      />
    )

    expect(screen.getByText("월별 매출")).toBeInTheDocument()
    expect(screen.getByText("최근 3개월 매출 추이")).toBeInTheDocument()
    expect(container.querySelector('[data-slot="chart"]')).not.toBeNull()
  })

  it("잘못된 chart block은 fallback UI로 처리한다.", () => {
    render(
      <MarkdownContentRenderer
        content={`
\`\`\`chart
{"type":"pie","nameKey":"name","dataKey":"value","data":[{"name":"검색","value":"oops"}]}
\`\`\`
`}
      />
    )

    expect(
      screen.getByText("차트 블록을 렌더링하지 못했습니다.")
    ).toBeInTheDocument()
    expect(
      screen.getByText(/chart 블록 형식이 올바르지 않습니다/)
    ).toBeInTheDocument()
  })
})
