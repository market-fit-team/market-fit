import { type ReactNode, useCallback, useMemo, useState } from "react"
import { useStream } from "@langchain/langgraph-sdk/react"
import {
  LangGraphChatStreamContext,
  type LangGraphChatStreamContextValue,
} from "@/features/llm-chat/hooks/langgraph-chat-stream-context"
import {
  DEFAULT_LANGGRAPH_STREAM_MODE,
  buildSubmitContext,
} from "@/features/llm-chat/lib/langgraph/build-submit-config"
import { buildSubmitInput } from "@/features/llm-chat/lib/langgraph/build-submit-input"
import type {
  HitlRequest,
  HitlResume,
} from "@/features/llm-chat/types/hitl-interrupt-payload"
import type { LlmChatGraphState } from "@/features/llm-chat/types/langgraph-chat-state"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import { withCsrfHeaders } from "@/shared/api/csrf"

type SendMessageOptions = Pick<
  LangGraphChatStreamContextValue,
  "modelSelection" | "toolPolicy"
>

type LlmChatStreamBag = {
  InterruptType: HitlRequest
  ConfigurableType: Partial<ReturnType<typeof buildSubmitContext>>
  UpdateType: LlmChatGraphState
}

type LangGraphChatStreamProviderProps = {
  children: ReactNode
  tools: LlmToolDefinition[]
  models: LangGraphChatStreamContextValue["models"]
  modelSelection: LangGraphChatStreamContextValue["modelSelection"]
  toolPolicy: LangGraphChatStreamContextValue["toolPolicy"]
}

const langGraphFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    credentials: "include",
    headers: withCsrfHeaders(init?.headers),
  })

export function LangGraphChatStreamProvider({
  children,
  tools,
  models,
  modelSelection,
  toolPolicy,
}: LangGraphChatStreamProviderProps) {
  const [threadId, setThreadId] = useState<string | null>(null)
  const [localNotice, setLocalNotice] = useState<string | null>(null)
  const stream = useStream<LlmChatGraphState, LlmChatStreamBag>({
    // LangGraph SDK는 브라우저에서 직접 Agent Server native API를 호출합니다.
    // 실제 JWT는 /api/proxy/agent BFF 경계에서 Better Auth 토큰으로 교체됩니다.
    apiUrl: "/api/proxy/agent",
    apiKey: null,
    assistantId: "chat",
    callerOptions: {
      fetch: langGraphFetch,
    },
    fetchStateHistory: false,
    messagesKey: "messages",
    reconnectOnMount: true,
    threadId,
    onThreadId: setThreadId,
    onCreated: (run) => {
      setThreadId(run.thread_id)
      setLocalNotice(null)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error)
      setLocalNotice(`오류: ${message}`)
    },
    onFinish: () => {
      setLocalNotice(null)
    },
  })

  const sendMessage = useCallback(
    async (
      content: string,
      options: SendMessageOptions = { modelSelection, toolPolicy }
    ) => {
      const trimmed = content.trim()
      if (!trimmed || stream.isLoading) {
        return
      }

      const context = buildSubmitContext(
        options.modelSelection,
        options.toolPolicy
      )
      // 기존 FastAPI adapter가 해주던 context -> state 복사를 native Agent Server 입력에서 직접 맞춥니다.
      const input = buildSubmitInput(trimmed, context)
      const optimisticMessage = input.messages[0]

      await stream.submit(input, {
        config: {
          configurable: context,
        },
        context,
        streamMode: [...DEFAULT_LANGGRAPH_STREAM_MODE],
        streamResumable: true,
        optimisticValues: (previous) => ({
          messages: [...(previous.messages ?? []), optimisticMessage],
        }),
      })
    },
    [modelSelection, stream, toolPolicy]
  )

  const resume = useCallback(
    async (
      decisions: Parameters<LangGraphChatStreamContextValue["resume"]>[0]
    ) => {
      if (stream.isLoading) {
        return
      }

      await stream.submit(null, {
        command: {
          resume: {
            decisions,
          } satisfies HitlResume,
        },
        context: {
          allowed_tools: toolPolicy.allowedTools,
          interrupt_on: toolPolicy.interruptOn,
        },
        streamMode: [...DEFAULT_LANGGRAPH_STREAM_MODE],
        streamResumable: true,
      })
    },
    [stream, toolPolicy]
  )

  const resetChat = useCallback(async () => {
    if (stream.isLoading) {
      await stream.stop()
    }
    stream.switchThread(null)
    setThreadId(null)
    setLocalNotice(null)
    toolPolicy.resetToDefault()
  }, [stream, toolPolicy])

  const value = useMemo<LangGraphChatStreamContextValue>(() => {
    return {
      tools,
      models,
      modelSelection,
      toolPolicy,
      threadId,
      messages: stream.messages,
      toolProgress: stream.toolProgress,
      hitlInterrupts: stream.interrupts,
      localNotice,
      isBusy: stream.isLoading,
      streamStatus: stream.isLoading ? "streaming" : "idle",
      sendMessage,
      resume,
      resetChat,
    }
  }, [
    tools,
    models,
    modelSelection,
    toolPolicy,
    threadId,
    stream.messages,
    stream.toolProgress,
    stream.interrupts,
    stream.isLoading,
    localNotice,
    sendMessage,
    resume,
    resetChat,
  ])

  return (
    <LangGraphChatStreamContext.Provider value={value}>
      {children}
    </LangGraphChatStreamContext.Provider>
  )
}
