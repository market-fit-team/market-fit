import { describe, expect, it, vi } from "vitest"
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages"
import { fireEvent, render, screen } from "@testing-library/react"
import { ChatView } from "@/features/chat/components/workspace/chat-view"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"

const sendMessage = vi.fn().mockResolvedValue(undefined)
const streamState = vi.hoisted(() => ({
  current: {
    hitlInterrupts: [],
    isBusy: false,
    isHydrating: false,
    localNotice: null,
    messages: [],
    toolCalls: [],
  },
}))

vi.mock("@/features/chat/hooks/use-langgraph-chat-stream", () => ({
  useLangGraphChatStream: () => ({
    ...streamState.current,
    models: [
      {
        id: "gpt-5-mini",
        object: "model",
        created: 0,
        supportedReasoningEfforts: ["none", "low", "medium"],
      },
    ],
    modelSelection: {
      model: "gpt-5-mini",
      reasoningEffort: "medium",
      selectedModel: {
        id: "gpt-5-mini",
        object: "model",
        created: 0,
        supportedReasoningEfforts: ["none", "low", "medium"],
      },
      selectModel: vi.fn(),
      selectReasoningEffort: vi.fn(),
    },
    resume: vi.fn(),
    sendMessage,
  }),
}))

vi.mock("@/features/chat/providers/chat-workspace-provider", () => ({
  useChatWorkspace: () => ({
    selectedArtifactIds: ["artifact-1"],
    selectedDocumentIds: ["doc-1"],
    setIsSelectionLocked: vi.fn(),
    setRightPanel: vi.fn(),
    toggleArtifact: vi.fn(),
    toggleDocument: vi.fn(),
  }),
}))

const documents: DocumentResponse[] = [
  {
    id: "doc-1",
    type: "markdown",
    title: "문서",
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
    title: "아티팩트",
    summary: null,
    raw_text: "본문",
    version: 1,
    created_at: "2026-06-25T00:00:00Z",
    updated_at: "2026-06-25T00:00:00Z",
  },
]

describe("ChatView", () => {
  it("선택된 문서와 아티팩트 id를 메시지 전송 옵션에 포함한다.", () => {
    streamState.current = {
      hitlInterrupts: [],
      isBusy: false,
      isHydrating: false,
      localNotice: null,
      messages: [],
      toolCalls: [],
    }

    const { container } = render(
      <ChatView
        activeThreadTitle="새 대화"
        artifacts={artifacts}
        documents={documents}
        isRightPanelOpen={false}
        isExpanded={false}
        onToggleExpand={vi.fn()}
        onToggleRightPanel={vi.fn()}
      />
    )

    fireEvent.change(screen.getByPlaceholderText("메시지를 입력하세요..."), {
      target: { value: "테스트 메시지" },
    })
    fireEvent.click(container.querySelector("#chat-send-btn")!)

    expect(sendMessage).toHaveBeenCalledWith("테스트 메시지", {
      selectedArtifactIds: ["artifact-1"],
      selectedDocumentIds: ["doc-1"],
    })
  })

  it("assistant turn 안에 생각과 도구 호출 결과를 분리해서 렌더링한다.", () => {
    streamState.current = {
      hitlInterrupts: [],
      isBusy: false,
      isHydrating: false,
      localNotice: null,
      messages: [
        new HumanMessage({
          id: "human-1",
          content: "아무 아티팩트나 만들어봐",
        }),
        new AIMessage({
          id: "ai-1",
          content: "도구를 실행해볼게요.",
          tool_calls: [
            {
              id: "tool-1",
              name: "artifact_create",
              args: { artifact_type: "markdown" },
            },
          ],
        }),
        new ToolMessage({
          id: "tool-message-1",
          content: '{"id":"artifact-1","title":"아티팩트"}',
          tool_call_id: "tool-1",
        }),
        new AIMessage({
          id: "ai-2",
          content: "완료했습니다.",
        }),
      ],
      toolCalls: [
        {
          id: "tool-1",
          callId: "tool-1",
          name: "artifact_create",
          status: "finished",
          args: { artifact_type: "markdown" },
        },
      ],
    }

    render(
      <ChatView
        activeThreadTitle="새 대화"
        artifacts={[
          {
            ...artifacts[0],
            source_tool_call_id: "tool-1",
          },
        ]}
        documents={documents}
        isRightPanelOpen={false}
        isExpanded={false}
        onToggleExpand={vi.fn()}
        onToggleRightPanel={vi.fn()}
      />
    )

    expect(
      screen.getByRole("button", { name: /도구 호출 결과/i })
    ).toBeInTheDocument()
    expect(screen.getByText("artifact_create")).toBeInTheDocument()
    expect(screen.getByText("결과")).toBeInTheDocument()
    expect(screen.queryByText("생각 및 도구 호출 과정")).toBeNull()
    expect(screen.queryByText("도움이 됨")).toBeNull()
    expect(screen.queryByText("개선 필요")).toBeNull()
  })
})
