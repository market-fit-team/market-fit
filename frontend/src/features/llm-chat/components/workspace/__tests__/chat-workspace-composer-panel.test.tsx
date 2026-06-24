import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { ChatWorkspaceComposerPanel } from "@/features/llm-chat/components/workspace/chat-workspace-composer-panel"

const sendMessage = vi.fn()

vi.mock("@/features/llm-chat/hooks/use-langgraph-chat-stream", () => ({
  useLangGraphChatStream: () => ({
    models: [],
    tools: [],
    modelSelection: {
      model: "gpt-5-mini",
      reasoningEffort: "medium",
      selectedModel: {
        id: "gpt-5-mini",
        object: "model",
        created: 1,
        supportedReasoningEfforts: ["medium"],
      },
      selectModel: vi.fn(),
      selectReasoningEffort: vi.fn(),
    },
    toolPolicy: {
      allowedTools: [],
      interruptOn: {},
      summary: "",
      toggleTool: vi.fn(),
      resetToDefault: vi.fn(),
    },
    hasPendingInterrupt: false,
    isBusy: false,
    isHydrating: false,
    streamStatus: "idle",
    sendMessage,
  }),
}))

vi.mock("@/features/llm-chat/providers/chat-workspace-ui-provider", () => ({
  useChatWorkspaceUi: () => ({
    selectedDocumentIds: ["doc-1"],
    selectedArtifactIds: ["artifact-1"],
  }),
}))

vi.mock("@/features/llm-chat/components/composer/chat-model-menu", () => ({
  ChatModelMenu: () => <div>model-menu</div>,
}))

vi.mock(
  "@/features/llm-chat/components/workspace/chat-selection-chips",
  () => ({
    ChatSelectionChips: () => <div>selection-chips</div>,
  })
)

vi.mock("@/features/llm-chat/components/composer/chat-composer", () => ({
  ChatComposer: ({ onSubmit }: { onSubmit: (message: string) => void }) => (
    <button type="button" onClick={() => onSubmit("테스트 메시지")}>
      보내기
    </button>
  ),
}))

describe("ChatWorkspaceComposerPanel", () => {
  it("선택된 문서와 아티팩트를 sendMessage 옵션에 함께 전달한다.", () => {
    render(<ChatWorkspaceComposerPanel currentThreadId="thread-1" />)

    fireEvent.click(screen.getByRole("button", { name: "보내기" }))

    expect(sendMessage).toHaveBeenCalledWith("테스트 메시지", {
      selectedDocumentIds: ["doc-1"],
      selectedArtifactIds: ["artifact-1"],
    })
  })
})
