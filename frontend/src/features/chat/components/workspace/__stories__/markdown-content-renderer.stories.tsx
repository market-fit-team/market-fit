import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MarkdownContentRenderer } from "@/features/chat/components/workspace/markdown-content-renderer"

const validMarkdown = `# 상권 요약

성수동은 최근 3개 분기 동안 **유입량**과 **객단가**가 함께 상승했습니다.

- 주요 소비층: 20대 후반 ~ 30대 초반
- 추천 업종: 체험형 쇼룸, 베이커리, 로스터리 카페

\`\`\`chart
{
  "type": "bar",
  "title": "분기별 방문 지표",
  "description": "최근 3개 분기의 방문량 변화입니다.",
  "xKey": "quarter",
  "series": [
    { "key": "visitors", "label": "방문량" },
    { "key": "sales", "label": "매출" }
  ],
  "data": [
    { "quarter": "2025 3Q", "visitors": 120, "sales": 84 },
    { "quarter": "2025 4Q", "visitors": 148, "sales": 103 },
    { "quarter": "2026 1Q", "visitors": 172, "sales": 117 }
  ]
}
\`\`\`

후속 액션으로는 주말 피크 시간대 운영 시뮬레이션을 권장합니다.`

const pieChartMarkdown = `## 검색 채널 비중

\`\`\`chart
{
  "type": "pie",
  "title": "검색 채널 비중",
  "description": "최근 유입 채널의 비중입니다.",
  "nameKey": "name",
  "dataKey": "value",
  "data": [
    { "name": "네이버", "value": 46 },
    { "name": "구글", "value": 31 },
    { "name": "인스타그램", "value": 23 }
  ]
}
\`\`\``

const invalidMarkdown = `## 잘못된 차트 예시

\`\`\`chart
{
  "type": "line",
  "xKey": "month",
  "series": [{ "key": "sales", "label": "매출" }],
  "data": [{ "month": "1월", "sales": "oops" }]
}
\`\`\``

const meta = {
  title: "Chat/Workspace/MarkdownContentRenderer",
  component: MarkdownContentRenderer,
  tags: ["autodocs"],
  args: {
    content: validMarkdown,
  },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-2xl bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MarkdownContentRenderer>

export default meta

type Story = StoryObj<typeof meta>

export const WithBarChart: Story = {}

export const WithPieChart: Story = {
  args: {
    content: pieChartMarkdown,
  },
}

export const InvalidChartFallback: Story = {
  args: {
    content: invalidMarkdown,
  },
}
