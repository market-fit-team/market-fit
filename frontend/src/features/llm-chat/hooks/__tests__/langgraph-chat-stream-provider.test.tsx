import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ChatModelSelectionControls } from "@/features/llm-chat/hooks/langgraph-chat-stream-context"
import type { ToolPolicyControls } from "@/features/llm-chat/hooks/langgraph-chat-stream-context"
import { LangGraphChatStreamProvider } from "@/features/llm-chat/hooks/langgraph-chat-stream-provider"
import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"

const submitMock = vi.hoisted(() => vi.fn())
const respondMock = vi.hoisted(() => vi.fn())
const useStreamOptions = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))

vi.mock("@langchain/react", () => ({
  useStream: (options: Record<string, unknown>) => {
    useStreamOptions.current = options
    return {
      threadId: "langgraph-thread-1",
      messages: [],
      toolCalls: [],
      interrupts: [],
      error: undefined,
      isLoading: false,
      isThreadLoading: false,
      submit: submitMock,
      respond: respondMock,
      stop: vi.fn(),
    }
  },
}))

const tools: LlmToolDefinition[] = [
  {
    name: "add",
    description: "더하기",
    category: "calculator",
    defaultAllowed: true,
    allowedDecisions: ["approve"],
  },
]

const modelSelection: ChatModelSelectionControls = {
  model: "gpt-oss:120b",
  reasoningEffort: "medium",
  selectedModel: {
    id: "gpt-oss:120b",
    object: "model",
    created: 0,
    supportedReasoningEfforts: ["medium"],
  },
  selectModel: vi.fn(),
  selectReasoningEffort: vi.fn(),
}

const toolPolicy: ToolPolicyControls = {
  allowedToolNames: new Set(["add"]),
  allowedTools: ["add"],
  interruptOn: { add: false },
  summary: "",
  toggleTool: vi.fn(),
  resetToDefault: vi.fn(),
}

function ProviderHarness() {
  const { resume, sendMessage } = useLangGraphChatStream()

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          void sendMessage("계산해줘", {
            selectedDocumentIds: [],
            selectedArtifactIds: ["artifact-1"],
          })
        }
      >
        submit
      </button>
      <button type="button" onClick={() => void resume([{ type: "approve" }])}>
        resume
      </button>
    </div>
  )
}

describe("LangGraphChatStreamProvider", () => {
  it("workspace thread hydrate는 useStream threadId에 맡기고 initialValues를 넘기지 않는다", () => {
    render(
      <LangGraphChatStreamProvider
        tools={tools}
        models={[modelSelection.selectedModel]}
        modelSelection={modelSelection}
        toolPolicy={toolPolicy}
        workspaceThread={{
          appThreadId: "app-thread-1",
          langgraphThreadId: "langgraph-thread-1",
        }}
      >
        <ProviderHarness />
      </LangGraphChatStreamProvider>
    )

    expect(useStreamOptions.current).toMatchObject({
      threadId: "langgraph-thread-1",
      assistantId: "chat",
    })
    expect(useStreamOptions.current).not.toHaveProperty("initialValues")
  })

  it("submit은 선택 ID를 포함하고 respond는 선택 ID를 제외한다", async () => {
    render(
      <LangGraphChatStreamProvider
        tools={tools}
        models={[modelSelection.selectedModel]}
        modelSelection={modelSelection}
        toolPolicy={toolPolicy}
        workspaceThread={{
          appThreadId: "app-thread-1",
          langgraphThreadId: "langgraph-thread-1",
        }}
      >
        <ProviderHarness />
      </LangGraphChatStreamProvider>
    )

    await userEvent.click(screen.getByRole("button", { name: "submit" }))
    await userEvent.click(screen.getByRole("button", { name: "resume" }))

    expect(submitMock.mock.calls[0]?.[1]).toMatchObject({
      config: {
        configurable: {
          app_thread_id: "app-thread-1",
          selected_document_ids: [],
          selected_artifact_ids: ["artifact-1"],
        },
      },
    })
    expect(respondMock.mock.calls[0]?.[1]).toMatchObject({
      config: {
        configurable: {
          app_thread_id: "app-thread-1",
        },
      },
    })
    expect(
      respondMock.mock.calls[0]?.[1]?.config.configurable
    ).not.toHaveProperty("selected_document_ids")
  })
})
