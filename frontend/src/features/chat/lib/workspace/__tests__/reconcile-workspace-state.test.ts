import { describe, expect, it } from "vitest"
import {
  areWorkspaceSelectionsEqual,
  getWorkspaceRefreshPlan,
  pruneWorkspaceSelections,
  reconcileWorkspaceRightPanel,
} from "@/features/chat/lib/workspace/reconcile-workspace-state"
import type { ChatRightPanel } from "@/features/chat/types/workspace"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"

const documents: DocumentResponse[] = [
  {
    id: "doc-1",
    type: "markdown",
    title: "문서 1",
    summary: null,
    raw_text: "본문",
    source_artifact_id: null,
    created_at: "2026-06-25T00:00:00Z",
    updated_at: "2026-06-25T00:00:00Z",
  },
]

const artifacts: ArtifactResponse[] = [
  {
    id: "artifact-1",
    thread_id: "thread-1",
    langgraph_thread_id: "lg-thread-1",
    source_message_id: null,
    source_tool_call_id: null,
    type: "markdown",
    title: "아티팩트 1",
    summary: null,
    raw_text: "본문",
    version: 1,
    created_at: "2026-06-25T00:00:00Z",
    updated_at: "2026-06-25T00:00:00Z",
  },
]

describe("reconcileWorkspaceState", () => {
  it("현재 목록에 없는 선택 항목을 정리한다.", () => {
    const nextSelections = pruneWorkspaceSelections({
      documentIds: ["doc-1", "doc-missing"],
      artifactIds: ["artifact-1", "artifact-missing"],
      documents,
      artifacts,
    })

    expect(nextSelections).toEqual({
      documentIds: ["doc-1"],
      artifactIds: ["artifact-1"],
    })
  })

  it("문서 상세 패널 snapshot을 최신 query 결과로 다시 맞춘다.", () => {
    const stalePanel: ChatRightPanel = {
      kind: "library-document",
      document: {
        ...documents[0],
        title: "예전 제목",
      },
    }

    const nextPanel = reconcileWorkspaceRightPanel({
      panel: stalePanel,
      documents,
      artifacts,
    })

    expect(nextPanel).toEqual({
      kind: "library-document",
      document: documents[0],
    })
  })

  it("현재 query에 없는 아티팩트 상세 패널은 닫는다.", () => {
    const stalePanel: ChatRightPanel = {
      kind: "artifact",
      artifact: {
        ...artifacts[0],
        id: "artifact-missing",
      },
    }

    const nextPanel = reconcileWorkspaceRightPanel({
      panel: stalePanel,
      documents,
      artifacts,
    })

    expect(nextPanel).toBeNull()
  })

  it("새로 완료된 mutation tool call만 invalidate 대상으로 계산한다.", () => {
    const refreshPlan = getWorkspaceRefreshPlan({
      processedCallIds: new Set(["call-1"]),
      toolCalls: [
        {
          id: "call-1",
          callId: "call-1",
          name: "artifact_create",
          status: "finished",
          args: {},
        },
        {
          id: "call-2",
          callId: "call-2",
          name: "artifact_save_as_document",
          status: "finished",
          args: {},
        },
        {
          id: "call-3",
          callId: "call-3",
          name: "document_read",
          status: "finished",
          args: {},
        },
      ] as never,
    })

    expect(refreshPlan).toEqual({
      invalidateArtifacts: false,
      invalidateDocuments: true,
      processedCallIds: ["call-2", "call-3"],
    })
  })

  it("선택 상태 비교는 id 목록이 달라지면 false를 반환한다.", () => {
    expect(
      areWorkspaceSelectionsEqual(
        {
          documentIds: ["doc-1"],
          artifactIds: ["artifact-1"],
        },
        {
          documentIds: ["doc-1"],
          artifactIds: ["artifact-1"],
        }
      )
    ).toBe(true)

    expect(
      areWorkspaceSelectionsEqual(
        {
          documentIds: ["doc-1"],
          artifactIds: ["artifact-1"],
        },
        {
          documentIds: [],
          artifactIds: ["artifact-1"],
        }
      )
    ).toBe(false)
  })
})
