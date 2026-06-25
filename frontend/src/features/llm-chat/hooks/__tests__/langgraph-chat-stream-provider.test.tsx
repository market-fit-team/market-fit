import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ChatModelSelectionControls } from "@/features/llm-chat/hooks/langgraph-chat-stream-context"
import type { ToolPolicyControls } from "@/features/llm-chat/hooks/langgraph-chat-stream-context"
import { LangGraphChatStreamProvider } from "@/features/llm-chat/hooks/langgraph-chat-stream-provider"
import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"
import type { HitlInterrupt } from "@/features/llm-chat/types/hitl-interrupt-payload"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"

const submitMock = vi.hoisted(() => vi.fn())
const respondMock = vi.hoisted(() => vi.fn())
const stopMock = vi.hoisted(() => vi.fn())
const useStreamOptions = vi.hoisted(() => ({
  current: null as Record<string, unknown> | null,
}))
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
    interrupts: HitlInterrupt[]
    error: unknown
    isLoading: boolean
    isThreadLoading: boolean
  },
}))

vi.mock("@langchain/react", () => ({
  useStream: (options: Record<string, unknown>) => {
    useStreamOptions.current = options
    return {
      ...useStreamState.current,
      submit: submitMock,
      respond: respondMock,
      stop: stopMock,
    }
  },
}))

const createHitlInterrupt = (id = "interrupt-1"): HitlInterrupt => ({
  id,
  value: {
    action_requests: [
      {
        name: "add",
        args: { a: 1, b: 2 },
      },
    ],
    review_configs: [
      {
        action_name: "add",
        allowed_decisions: ["approve"],
      },
    ],
  },
})

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
  const {
    hasPendingInterrupt,
    hitlInterrupts,
    localNotice,
    resume,
    sendMessage,
  } = useLangGraphChatStream()

  return (
    <div>
      <output aria-label="hitl-count">{hitlInterrupts.length}</output>
      <output aria-label="has-pending-interrupt">
        {String(hasPendingInterrupt)}
      </output>
      {localNotice && <output aria-label="local-notice">{localNotice}</output>}
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
  beforeEach(() => {
    submitMock.mockReset()
    respondMock.mockReset()
    stopMock.mockReset()
    submitMock.mockResolvedValue(undefined)
    respondMock.mockResolvedValue(undefined)
    useStreamOptions.current = null
    useStreamState.current = {
      threadId: "langgraph-thread-1",
      messages: [],
      toolCalls: [],
      interrupts: [],
      error: undefined,
      isLoading: false,
      isThreadLoading: false,
    }
    vi.spyOn(console, "debug").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it("respond 전송 중에는 같은 interrupt resume을 중복 전송하지 않는다", async () => {
    respondMock.mockReturnValue(new Promise(() => undefined))

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

    const resumeButton = screen.getByRole("button", { name: "resume" })
    await userEvent.click(resumeButton)
    await userEvent.click(resumeButton)

    expect(respondMock).toHaveBeenCalledTimes(1)
  })

  it("stream error가 있으면 replay된 interrupt를 pending HITL로 노출하지 않는다", () => {
    useStreamState.current = {
      ...useStreamState.current,
      interrupts: [createHitlInterrupt("stale-interrupt-1")],
      error: new Error("HTTP 401"),
    }

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

    expect(screen.getByLabelText("hitl-count")).toHaveTextContent("0")
    expect(screen.getByLabelText("has-pending-interrupt")).toHaveTextContent(
      "false"
    )
    expect(screen.getByLabelText("local-notice")).toHaveTextContent(
      "오류: HTTP 401"
    )
  })
})
