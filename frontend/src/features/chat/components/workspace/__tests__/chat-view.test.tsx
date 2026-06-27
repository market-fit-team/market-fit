import type { ComponentProps } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ChatView } from "@/features/chat/components/workspace/chat-view"
import type { ToolPermissionPreset } from "@/features/chat/lib/tool-policy/tool-permission-presets"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"

const sendMessage = vi.fn().mockResolvedValue(undefined)
const saveArtifactAsDocument = vi.fn()
const selectPreset = vi.fn()
const streamState = vi.hoisted(() => ({
  current: {
    hitlInterrupts: [],
    isBusy: false,
    isHydrating: false,
    localNotice: null,
    messages: [] as BaseMessage[],
    toolCalls: [] as AssembledToolCall[],
  },
}))
const workspaceState = vi.hoisted(() => ({
  current: {
    selectedArtifactIds: ["artifact-1"],
    selectedDocumentIds: ["doc-1"],
    setIsSelectionLocked: vi.fn(),
    setRightPanel: vi.fn(),
    toggleArtifact: vi.fn(),
    toggleDocument: vi.fn(),
  },
}))

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false
}

if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => undefined
}

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
    toolPolicy: {
      allowedToolNames: new Set(["artifact_get"]),
      allowedTools: ["artifact_get"],
      interruptOn: {},
      summary: "1 auto / 1 review",
      selectedPreset: "allow-default" as ToolPermissionPreset,
      selectPreset,
      toggleTool: vi.fn(),
      resetToDefault: vi.fn(),
    },
  }),
}))

vi.mock("@/features/chat/providers/chat-workspace-provider", () => ({
  useChatWorkspace: (
    selector?: (state: typeof workspaceState.current) => unknown
  ) => (selector ? selector(workspaceState.current) : workspaceState.current),
}))

vi.mock(
  "@/shared/api/generated/agent/endpoints/agent-artifacts/agent-artifacts",
  () => ({
    useSaveArtifactAsDocumentApiV1AgentArtifactsArtifactIdSaveAsDocumentPost:
      () => ({
        mutate: saveArtifactAsDocument,
        isPending: false,
      }),
  })
)

const documents: DocumentResponse[] = [
  {
    id: "doc-1",
    type: "markdown",
    title: "저장된 문서",
    summary: null,
    raw_text: "문서 본문",
    source_artifact_id: "artifact-1",
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
    title: "초안 아티팩트",
    summary: "임시 초안입니다.",
    raw_text: "초안 본문",
    version: 1,
    created_at: "2026-06-25T00:00:00Z",
    updated_at: "2026-06-25T00:00:00Z",
  },
]

const renderChatView = (props?: Partial<ComponentProps<typeof ChatView>>) => {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <ChatView
        activeThreadTitle="새 대화"
        artifacts={artifacts}
        documents={documents}
        isRightPanelOpen={false}
        isExpanded={false}
        onSetRightPanel={workspaceState.current.setRightPanel}
        onToggleExpand={vi.fn()}
        onToggleRightPanel={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  )
}

describe("ChatView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("선택된 문서와 아티팩트 id를 메시지 전송 옵션에 포함한다.", () => {
    streamState.current = {
      hitlInterrupts: [],
      isBusy: false,
      isHydrating: false,
      localNotice: null,
      messages: [],
      toolCalls: [],
    }

    const { container } = renderChatView()

    fireEvent.change(screen.getByPlaceholderText("메시지를 입력하세요..."), {
      target: { value: "테스트 메시지" },
    })
    fireEvent.click(container.querySelector("#chat-send-btn")!)

    expect(sendMessage).toHaveBeenCalledWith("테스트 메시지", {
      selectedArtifactIds: ["artifact-1"],
      selectedDocumentIds: ["doc-1"],
    })
  })

  it("창업 성향이 포함되면 컴포저 칩을 보여주고 제거 버튼을 누를 수 있다.", () => {
    streamState.current = {
      hitlInterrupts: [],
      isBusy: false,
      isHydrating: false,
      localNotice: null,
      messages: [],
      toolCalls: [],
    }
    const onRemoveOnboardingContext = vi.fn()

    renderChatView({
      hasOnboardingContext: true,
      onRemoveOnboardingContext,
    })

    expect(screen.getByText("창업 성향")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "창업 성향 포함 해제" }))

    expect(onRemoveOnboardingContext).toHaveBeenCalledTimes(1)
  })

  it("권한 변경 메뉴에서 프리셋을 선택할 수 있다.", async () => {
    streamState.current = {
      hitlInterrupts: [],
      isBusy: false,
      isHydrating: false,
      localNotice: null,
      messages: [],
      toolCalls: [],
    }
    const user = userEvent.setup()

    renderChatView()

    await user.click(screen.getByRole("combobox", { name: "권한 변경" }))
    await user.click(screen.getByText("전체 허용"))

    expect(selectPreset).toHaveBeenCalledWith("allow-all")
  })

  it("도구 호출 순서에 맞춰 아티팩트 카드와 라이브러리 카드가 중간에 보인다.", () => {
    streamState.current = {
      hitlInterrupts: [],
      isBusy: false,
      isHydrating: false,
      localNotice: null,
      messages: [
        new HumanMessage({
          id: "human-1",
          content: "초안 만들고 저장해줘",
        }),
        new AIMessage({
          id: "ai-1",
          content: "초안을 먼저 만들겠습니다.",
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
          content: JSON.stringify({
            id: "artifact-1",
            thread_id: "thread-1",
            type: "markdown",
            title: "초안 아티팩트",
            summary: "임시 초안입니다.",
            raw_text: "초안 본문",
            version: 1,
            source_message_id: null,
            source_tool_call_id: "tool-1",
          }),
          tool_call_id: "tool-1",
        }),
        new AIMessage({
          id: "ai-2",
          content: "이제 라이브러리에 저장하겠습니다.",
          tool_calls: [
            {
              id: "tool-2",
              name: "artifact_save_as_document",
              args: { artifact_id: "artifact-1" },
            },
          ],
        }),
        new ToolMessage({
          id: "tool-message-2",
          content: JSON.stringify({
            id: "doc-1",
            type: "markdown",
            title: "저장된 문서",
            summary: null,
            raw_text: "문서 본문",
            source_artifact_id: "artifact-1",
          }),
          tool_call_id: "tool-2",
        }),
        new AIMessage({
          id: "ai-3",
          content: "정리가 끝났습니다.",
        }),
      ],
      toolCalls: [
        {
          id: "tool-1",
          callId: "tool-1",
          name: "artifact_create",
          status: "finished",
          output: null,
          error: undefined,
          namespace: [],
          input: { artifact_type: "markdown" },
          args: { artifact_type: "markdown" },
        },
        {
          id: "tool-2",
          callId: "tool-2",
          name: "artifact_save_as_document",
          status: "finished",
          output: null,
          error: undefined,
          namespace: [],
          input: { artifact_id: "artifact-1" },
          args: { artifact_id: "artifact-1" },
        },
      ],
    }

    renderChatView()

    const firstText = screen.getByText("초안을 먼저 만들겠습니다.")
    const artifactLabel = screen.getByText("아티팩트 생성됨")
    const artifactTitle = screen.getByText("초안 아티팩트")
    const secondText = screen.getByText("이제 라이브러리에 저장하겠습니다.")
    const documentLabel = screen.getByText("라이브러리에 저장됨")
    const documentTitle = screen.getByText("저장된 문서")
    const finalText = screen.getByText("정리가 끝났습니다.")

    expect(artifactLabel).toBeInTheDocument()
    expect(documentLabel).toBeInTheDocument()
    expect(screen.queryByText("생성된 결과물")).toBeNull()

    expect(
      firstText.compareDocumentPosition(artifactTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      artifactTitle.compareDocumentPosition(secondText) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      secondText.compareDocumentPosition(documentTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      documentTitle.compareDocumentPosition(finalText) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it("웹 검색 결과 카드는 우측 패널 전용 뷰로 바로 연다.", () => {
    streamState.current = {
      hitlInterrupts: [],
      isBusy: false,
      isHydrating: false,
      localNotice: null,
      messages: [
        new HumanMessage({
          id: "human-1",
          content: "성수 팝업 트렌드를 검색해줘",
        }),
        new AIMessage({
          id: "ai-1",
          content: "검색 결과를 정리했습니다.",
          tool_calls: [
            {
              id: "tool-search",
              name: "web_search",
              args: { query: "성수동 팝업 스토어", limit: 2 },
            },
          ],
        }),
        new ToolMessage({
          id: "tool-message-search",
          content: JSON.stringify({
            query: "성수동 팝업 스토어",
            page: 1,
            results_count: 2,
            results: [
              {
                rank: 1,
                title: "성수 팝업 트렌드",
                url: "https://example.com/search",
                snippet: "검색 요약",
                engine: "brave",
                engines: ["brave"],
                published_date: "2026-06-26",
              },
            ],
          }),
          tool_call_id: "tool-search",
        }),
      ],
      toolCalls: [
        {
          id: "tool-search",
          callId: "tool-search",
          name: "web_search",
          status: "finished",
          output: null,
          error: undefined,
          namespace: [],
          input: { query: "성수동 팝업 스토어", limit: 2 },
          args: { query: "성수동 팝업 스토어", limit: 2 },
        },
      ],
    }

    renderChatView()

    expect(screen.getByText("웹 검색 결과")).toBeInTheDocument()
    expect(screen.getByText("성수 팝업 트렌드")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "검색 결과 패널 보기" }))

    expect(workspaceState.current.setRightPanel).toHaveBeenCalledWith({
      kind: "web-search",
      result: expect.objectContaining({
        query: "성수동 팝업 스토어",
        results_count: 2,
      }),
    })
  })
})
