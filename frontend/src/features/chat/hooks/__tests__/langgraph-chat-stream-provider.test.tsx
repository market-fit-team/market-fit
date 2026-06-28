import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type {
  ChatModelSelectionControls,
  ToolPolicyControls,
} from "@/features/chat/hooks/langgraph-chat-stream-context"
import { LangGraphChatStreamProvider } from "@/features/chat/hooks/langgraph-chat-stream-provider"
import { useLangGraphChatStream } from "@/features/chat/hooks/use-langgraph-chat-stream"
import type { LlmToolDefinition } from "@/features/chat/types/llm-tool-definition"

const submitMock = vi.hoisted(() => vi.fn())
const respondMock = vi.hoisted(() => vi.fn())
const stopMock = vi.hoisted(() => vi.fn())
const getStateMock = vi.hoisted(() => vi.fn())
const useStreamState = vi.hoisted(() => ({
  current: {
    threadId: "langgraph-thread-1",
    messages: [],
    toolCalls: [],
    interrupts: [],
    error: undefined,
    isLoading: false,
    isThreadLoading: false,
  } as {
    threadId: string
    messages: unknown[]
    toolCalls: unknown[]
    interrupts: unknown[]
    error: unknown
    isLoading: boolean
    isThreadLoading: boolean
  },
}))

vi.mock("@langchain/react", () => ({
  useStream: () => ({
    ...useStreamState.current,
    submit: submitMock,
    respond: respondMock,
    stop: stopMock,
  }),
}))

vi.mock("@/features/chat/lib/langgraph/chat-runtime-client", () => ({
  buildAgentApiUrl: () => "http://localhost:8088/api/agent",
  createLangGraphClient: () => ({
    threads: {
      getState: getStateMock,
    },
  }),
  langGraphFetch: vi.fn(),
}))

const tools: LlmToolDefinition[] = [
  {
    name: "artifact_get",
    description: "문서를 조회한다.",
    category: "artifact",
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
  allowedToolNames: new Set(["artifact_get"]),
  allowedTools: ["artifact_get"],
  interruptOn: { artifact_get: false },
  selectedPreset: null,
  summary: "",
  selectPreset: vi.fn(),
  toggleTool: vi.fn(),
  resetToDefault: vi.fn(),
}

function ProviderHarness() {
  const { queuedMessages, submitMessage } = useLangGraphChatStream()

  return (
    <div>
      <output aria-label="queue-count">{queuedMessages.length}</output>
      <output aria-label="queue-items">
        {queuedMessages.map((message) => message.content).join("|") ||
          "(empty)"}
      </output>
      <button
        type="button"
        onClick={() => void submitMessage("첫 번째 메시지")}
      >
        submit-first
      </button>
      <button
        type="button"
        onClick={() => void submitMessage("두 번째 메시지")}
      >
        submit-second
      </button>
    </div>
  )
}

const renderProvider = () => {
  return render(
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
}

describe("LangGraphChatStreamProvider", () => {
  beforeEach(() => {
    submitMock.mockReset()
    respondMock.mockReset()
    stopMock.mockReset()
    getStateMock.mockReset()
    submitMock.mockResolvedValue(undefined)
    respondMock.mockResolvedValue(undefined)
    stopMock.mockResolvedValue(undefined)
    getStateMock.mockResolvedValue({ tasks: [] })
    useStreamState.current = {
      threadId: "langgraph-thread-1",
      messages: [],
      toolCalls: [],
      interrupts: [],
      error: undefined,
      isLoading: false,
      isThreadLoading: false,
    }
  })

  it("전송을 시작한 메시지는 대기 목록에 남기지 않는다", async () => {
    let resolveSubmit: () => void = () => undefined
    submitMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        })
    )

    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "submit-first" }))

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByLabelText("queue-count")).toHaveTextContent("0")
    expect(screen.getByLabelText("queue-items")).toHaveTextContent("(empty)")

    resolveSubmit()
  })

  it("응답이 진행 중이면 다음 메시지만 실제 대기 목록에 쌓는다", async () => {
    let resolveSubmit: () => void = () => undefined
    submitMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve
        })
    )

    const view = renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "submit-first" }))
    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledTimes(1)
    })

    useStreamState.current = {
      ...useStreamState.current,
      isLoading: true,
    }
    view.rerender(
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

    await userEvent.click(screen.getByRole("button", { name: "submit-second" }))

    await waitFor(() => {
      expect(screen.getByLabelText("queue-count")).toHaveTextContent("1")
    })
    expect(screen.getByLabelText("queue-items")).toHaveTextContent(
      "두 번째 메시지"
    )
    expect(submitMock).toHaveBeenCalledTimes(1)

    resolveSubmit()
  })

  it("응답이 끝나면 추가 입력 없이 다음 대기 메시지를 자동 전송한다", async () => {
    let resolveFirstSubmit: () => void = () => undefined
    submitMock
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirstSubmit = resolve
          })
      )
      .mockResolvedValueOnce(undefined)

    const view = renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "submit-first" }))
    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledTimes(1)
    })

    useStreamState.current = {
      ...useStreamState.current,
      isLoading: true,
    }
    view.rerender(
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

    await userEvent.click(screen.getByRole("button", { name: "submit-second" }))
    await waitFor(() => {
      expect(screen.getByLabelText("queue-count")).toHaveTextContent("1")
    })

    useStreamState.current = {
      ...useStreamState.current,
      isLoading: false,
    }
    resolveFirstSubmit()
    view.rerender(
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

    await waitFor(() => {
      expect(submitMock).toHaveBeenCalledTimes(2)
    })
    await waitFor(() => {
      expect(screen.getByLabelText("queue-count")).toHaveTextContent("0")
    })
  })
})
