import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { LibraryPanel } from "@/features/chat/components/workspace/library-panel"
import type { DocumentResponse } from "@/shared/api/generated/agent/schemas"

const documents: DocumentResponse[] = [
  {
    id: "doc-1",
    type: "markdown",
    title: "시장 보고서",
    summary: "핵심 요약",
    raw_text: "본문",
    source_artifact_id: null,
    created_at: "2026-06-25T00:00:00Z",
    updated_at: "2026-06-25T00:00:00Z",
  },
]

describe("LibraryPanel", () => {
  it("문서 행을 클릭하면 상세 열기 핸들러를 호출한다.", () => {
    const onOpenDocument = vi.fn()

    render(
      <LibraryPanel
        documents={documents}
        onOpenDocument={onOpenDocument}
        onCollapsePanel={vi.fn()}
      />
    )

    const title = screen.getByText("시장 보고서")
    fireEvent.click(title.closest("[id^='library-row-']")!)

    expect(onOpenDocument).toHaveBeenCalledWith(documents[0])
  })
})
