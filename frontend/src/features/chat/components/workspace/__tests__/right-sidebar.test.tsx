import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
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
  title: "상권 리포트",
  summary: "차트가 포함된 문서",
  raw_text: `
# 요약

\`\`\`chart
{
  "type": "pie",
  "title": "유입 채널 비중",
  "nameKey": "name",
  "dataKey": "value",
  "data": [
    {"name": "검색", "value": 62},
    {"name": "SNS", "value": 38}
  ]
}
\`\`\`
`,
  source_artifact_id: null,
  created_at: "2026-06-25T00:00:00Z",
  updated_at: "2026-06-25T00:00:00Z",
}

const codeArtifact: ArtifactResponse = {
  id: "artifact-1",
  thread_id: "thread-1",
  langgraph_thread_id: "lg-thread-1",
  source_message_id: null,
  source_tool_call_id: null,
  type: "code",
  title: "예제 코드",
  summary: null,
  raw_text: "const value = 1",
  version: 1,
  created_at: "2026-06-25T00:00:00Z",
  updated_at: "2026-06-25T00:00:00Z",
}

describe("RightSidebar", () => {
  it("라이브러리 문서 상세에서 마크다운과 차트를 렌더링한다.", () => {
    render(
      <ChatWorkspaceProvider>
        <RightSidebar
          panel={{
            kind: "library-document",
            document: chartDocument,
          }}
          documents={[chartDocument]}
          onClose={vi.fn()}
          onOpenDocument={vi.fn()}
        />
      </ChatWorkspaceProvider>
    )

    expect(screen.getByText("유입 채널 비중")).toBeInTheDocument()
  })

  it("code 타입 아티팩트는 기존 raw text 블록으로 렌더링한다.", () => {
    const panel: ChatRightPanel = {
      kind: "artifact",
      artifact: codeArtifact,
    }

    render(
      <ChatWorkspaceProvider>
        <RightSidebar
          panel={panel}
          documents={[]}
          onClose={vi.fn()}
          onOpenDocument={vi.fn()}
        />
      </ChatWorkspaceProvider>
    )

    expect(screen.getByText("const value = 1")).toBeInTheDocument()
    expect(screen.queryByText("차트 블록을 렌더링하지 못했습니다.")).toBeNull()
  })
})
