import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RightSidebar } from "@/features/chat/components/workspace/right-sidebar"
import { ChatWorkspaceProvider } from "@/features/chat/providers/chat-workspace-provider"
import type { ChatRightPanel } from "@/features/chat/types/workspace"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"

const chartDocument: DocumentResponse = {
  id: "doc-1",
  type: "commercial_report",
  title: "성수동 상권 리포트",
  summary: "마크다운과 차트 블록이 함께 들어간 문서입니다.",
  raw_text: `# 핵심 해석

성수동은 최근 팝업 방문 수요와 F&B 객단가가 함께 상승했습니다.

\`\`\`chart
{
  "type": "line",
  "title": "분기별 추이",
  "description": "방문량과 객단가가 함께 우상향하고 있습니다.",
  "xKey": "quarter",
  "series": [
    { "key": "visitors", "label": "방문량" },
    { "key": "spend", "label": "객단가" }
  ],
  "data": [
    { "quarter": "2025 3Q", "visitors": 44, "spend": 39 },
    { "quarter": "2025 4Q", "visitors": 58, "spend": 45 },
    { "quarter": "2026 1Q", "visitors": 73, "spend": 52 }
  ]
}
\`\`\``,
  source_artifact_id: null,
  created_at: "2026-06-25T00:00:00Z",
  updated_at: "2026-06-25T00:00:00Z",
}

const codeArtifact: ArtifactResponse = {
  id: "artifact-1",
  thread_id: "thread-1",
  langgraph_thread_id: "lg-thread-1",
  source_message_id: "message-1",
  source_tool_call_id: "tool-1",
  type: "code",
  title: "예제 코드",
  summary: "코드 타입은 기존 raw text 뷰를 유지합니다.",
  raw_text: `export function sum(a: number, b: number) {
  return a + b
}`,
  version: 2,
  created_at: "2026-06-25T00:00:00Z",
  updated_at: "2026-06-25T00:00:00Z",
}

function RightSidebarStory({
  panel,
  documents = [chartDocument],
}: {
  panel: ChatRightPanel
  documents?: DocumentResponse[]
}) {
  return (
    <ChatWorkspaceProvider>
      <div className="h-[720px] w-[420px] overflow-hidden rounded-xl border border-border/30 bg-background">
        <RightSidebar
          panel={panel}
          documents={documents}
          onClose={() => undefined}
          onOpenDocument={() => undefined}
        />
      </div>
    </ChatWorkspaceProvider>
  )
}

const meta = {
  title: "Chat/Workspace/RightSidebar",
  component: RightSidebarStory,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-muted/20 p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RightSidebarStory>

export default meta

type Story = StoryObj<typeof meta>

export const LibraryDocumentWithChart: Story = {
  args: {
    panel: {
      kind: "library-document",
      document: chartDocument,
    },
  },
}

export const CodeArtifactRawView: Story = {
  args: {
    panel: {
      kind: "artifact",
      artifact: codeArtifact,
    },
  },
}
