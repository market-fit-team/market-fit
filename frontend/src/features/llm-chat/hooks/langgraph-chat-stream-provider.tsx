import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { useStream } from "@langchain/react"
import {
  LangGraphChatStreamContext,
  type LangGraphChatStreamContextValue,
} from "@/features/llm-chat/hooks/langgraph-chat-stream-context"
import { buildSubmitContext } from "@/features/llm-chat/lib/langgraph/build-submit-config"
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

  const apiUrl = useMemo(() => {
    const AGENT_PROXY_PATH = "/api/proxy/agent"
    const origin =
      process.env.NEXT_PUBLIC_APP_ORIGIN ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")

    // @langchain/react의 agent-server branch는 절대 URL을 기준으로
    // Protocol V2 /threads/{thread_id}/stream/events 및 /commands를 호출합니다.
    // BFF는 이 경로를 그대로 Agent Server로 프록시하고, JWT는 서버 경계에서 교체합니다.
    // 근거:
    // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
    // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
    return new URL(AGENT_PROXY_PATH, origin).toString()
  }, [])

  const stream = useStream<
    LlmChatGraphState,
    HitlRequest,
    Partial<ReturnType<typeof buildSubmitContext>>
  >({
    // Protocol V2 공식 React hook입니다. 기존 @langchain/langgraph-sdk/react useStream은
    // /runs/stream 기반 legacy 흐름으로 tools mode와 충돌했으므로 사용하지 않습니다.
    // 이 hook은 built-in SSE transport로 /stream/events + /commands를 사용하며,
    // messages/toolCalls/interrupts projection을 직접 제공합니다.
    // 근거:
    // https://reference.langchain.com/javascript/langchain-react/use-stream
    // https://github.com/langchain-ai/langgraphjs/blob/main/libs/sdk/CHANGELOG.md
    apiUrl,
    assistantId: "chat",
    fetch: langGraphFetch,
    messagesKey: "messages",
    optimistic: true,
    transport: "sse",
    threadId,
    onThreadId: setThreadId,
    onCreated: () => {
      setLocalNotice(null)
    },
    onCompleted: () => {
      setLocalNotice(null)
    },
  })

  useEffect(() => {
    if (!stream.error) {
      return
    }

    const message = stream.error instanceof Error ? stream.error.message : String(stream.error)
    setLocalNotice(`오류: ${message}`)
  }, [stream.error])

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
      const input = buildSubmitInput(trimmed)

      await stream.submit(input, {
        // Protocol V2 run.start command의 params.config로 전달됩니다.
        // 서버 graph는 StateGraph context_schema + Runtime.context로 이 값을 읽습니다.
        // 근거:
        // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
        // https://reference.langchain.com/python/langgraph/runtime/Runtime
        config: {
          configurable: context,
        },
        multitaskStrategy: "reject",
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

      const context = buildSubmitContext(modelSelection, toolPolicy)

      await stream.respond(
        {
          decisions,
        } satisfies HitlResume,
        {
          // Protocol V2 input.respond command도 resumed run에서 chat_model로 이어질 수 있으므로
          // 최초 submit과 동일한 full context를 config.configurable로 다시 보냅니다.
          // 근거:
          // https://reference.langchain.com/javascript/langchain-react/use-stream
          // https://docs.langchain.com/oss/python/langgraph/interrupts#resuming-interrupts
          config: {
            configurable: context,
          },
        }
      )
    },
    [modelSelection, stream, toolPolicy]
  )

  const resetChat = useCallback(async () => {
    if (stream.isLoading) {
      await stream.stop({ cancel: true })
    }
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
      threadId: stream.threadId ?? threadId,
      messages: stream.messages,
      toolCalls: stream.toolCalls,
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
    stream.threadId,
    threadId,
    stream.messages,
    stream.toolCalls,
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
