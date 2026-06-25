import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useStream } from "@langchain/react"
import {
  AuthSessionError,
  HttpStatusError,
  fetchWithAuthResponse,
} from "@/features/auth/lib/fetch-with-auth"
import {
  type ChatTurnOptions,
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

type LangGraphChatStreamProviderProps = {
  children: ReactNode
  tools: LlmToolDefinition[]
  models: LangGraphChatStreamContextValue["models"]
  modelSelection: LangGraphChatStreamContextValue["modelSelection"]
  toolPolicy: LangGraphChatStreamContextValue["toolPolicy"]
  workspaceThread?: {
    appThreadId: string
    langgraphThreadId: string
  } | null
}

const normalizeStreamErrorMessage = (error: unknown) => {
  if (error instanceof HttpStatusError) {
    if (typeof error.body === "string" && error.body.trim()) {
      return error.body
    }
    if (error.body != null) {
      return JSON.stringify(error.body)
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

const langGraphFetch: typeof fetch = async (input, init) => {
  try {
    return await fetchWithAuthResponse(input, {
      ...init,
      headers: withCsrfHeaders(init?.headers),
    })
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[llm-chat] LangGraph fetch failed", {
        input: String(input),
        error,
      })
    }
    throw error
  }
}

const toLocalNotice = (error: unknown) => {
  const message = normalizeStreamErrorMessage(error)

  if (error instanceof AuthSessionError) {
    return "오류: 로그인 세션을 확인하지 못했습니다. 다시 로그인한 뒤 채팅을 이어가 주세요."
  }
  if (error instanceof HttpStatusError && error.status === 401) {
    return "오류: 로그인 세션을 확인하지 못했습니다. 다시 로그인한 뒤 채팅을 이어가 주세요."
  }
  if (error instanceof HttpStatusError) {
    return `오류: 요청이 실패했습니다. (HTTP ${error.status})`
  }
  return `오류: ${message}`
}

export function LangGraphChatStreamProvider({
  children,
  tools,
  models,
  modelSelection,
  toolPolicy,
  workspaceThread,
}: LangGraphChatStreamProviderProps) {
  const [threadId, setThreadId] = useState<string | null>(
    workspaceThread?.langgraphThreadId ?? null
  )
  const activeThreadId = workspaceThread?.langgraphThreadId ?? threadId
  const [localErrorNotice, setLocalErrorNotice] = useState<string | null>(null)
  const [isResumePending, setIsResumePending] = useState(false)
  const isResumePendingRef = useRef(false)

  const apiUrl = useMemo(() => {
    const AGENT_PUBLIC_PATH = "/api/agent"
    const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:8088"

    // @langchain/react의 agent-server branch는 절대 URL을 기준으로
    // Protocol V2 /threads/{thread_id}/stream/events 및 /commands를 호출합니다.
    // Traefik은 이 경로를 그대로 Agent Server로 프록시하고, Authorization header의 OIDC token은 backend가 검증합니다.
    // 근거:
    // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
    // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
    return new URL(AGENT_PUBLIC_PATH, origin).toString()
  }, [])

  const stream = useStream<
    LlmChatGraphState,
    HitlRequest,
    Partial<ReturnType<typeof buildSubmitContext>>
  >({
    // Protocol V2 공식 React hook입니다. 기존 @langchain/langgraph-sdk/react useStream은
    // /runs/stream 기반 legacy 흐름으로 tools mode와 충돌했으므로 사용하지 않습니다.
    // 이 hook은 thread lifecycle과 hydrate를 소유하고 messages/toolCalls/interrupts
    // projection을 직접 제공합니다. workspace는 별도 initialValues를 넣지 않습니다.
    // 근거:
    // https://reference.langchain.com/javascript/langchain-react/use-stream
    // https://docs.langchain.com/oss/python/langchain/frontend/overview
    // https://github.com/langchain-ai/langgraphjs/blob/main/libs/sdk/CHANGELOG.md
    apiUrl,
    assistantId: "chat",
    fetch: langGraphFetch,
    messagesKey: "messages",
    optimistic: true,
    transport: "sse",
    threadId: activeThreadId,
    onThreadId: workspaceThread ? undefined : setThreadId,
  })

  const rawHitlInterrupts = stream.interrupts
  const streamErrorNotice = stream.error ? toLocalNotice(stream.error) : null
  const localNotice = localErrorNotice ?? streamErrorNotice
  const isStreamProjectionReliable = !stream.error
  const hitlInterrupts = useMemo(
    () => (isStreamProjectionReliable ? rawHitlInterrupts : []),
    [isStreamProjectionReliable, rawHitlInterrupts]
  )

  const rawHitlInterruptIds = useMemo(
    () => rawHitlInterrupts.map((interrupt) => interrupt.id),
    [rawHitlInterrupts]
  )
  const visibleHitlInterruptIds = useMemo(
    () => hitlInterrupts.map((interrupt) => interrupt.id),
    [hitlInterrupts]
  )

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return
    }
    if (rawHitlInterruptIds.length === 0 && !stream.error) {
      return
    }

    // HITL은 LangGraph checkpoint에 남아 있는 pending interrupt만 렌더링한다.
    // @langchain/react는 hydrate(getState) 성공 시 tasks[].interrupts를 기준으로
    // replay된 input.requested를 거르므로, stream.error가 있으면 projection을 승인 UI로
    // 쓰지 않는다.
    // 근거:
    // https://reference.langchain.com/javascript/langchain-react/use-stream
    // https://docs.langchain.com/oss/python/langchain/frontend/human-in-the-loop
    // 예제:
    // https://github.com/langchain-ai/agent-chat-ui
    console.debug("[llm-chat] LangGraph HITL snapshot", {
      threadId: stream.threadId ?? activeThreadId,
      isThreadLoading: stream.isThreadLoading,
      isLoading: stream.isLoading,
      error: stream.error,
      rawInterruptIds: rawHitlInterruptIds,
      visibleInterruptIds: visibleHitlInterruptIds,
      suppressedByStreamError:
        !isStreamProjectionReliable && rawHitlInterruptIds.length > 0,
    })
  }, [
    activeThreadId,
    isStreamProjectionReliable,
    rawHitlInterruptIds,
    stream.error,
    stream.isLoading,
    stream.isThreadLoading,
    stream.threadId,
    visibleHitlInterruptIds,
  ])

  const sendMessage = useCallback(
    async (content: string, options: ChatTurnOptions = {}) => {
      const trimmed = content.trim()
      if (!trimmed || stream.isLoading) {
        return
      }
      setLocalErrorNotice(null)

      const context = buildSubmitContext(
        modelSelection,
        toolPolicy,
        workspaceThread?.appThreadId,
        options.selectedDocumentIds ?? [],
        options.selectedArtifactIds ?? []
      )
      const input = buildSubmitInput(trimmed)

      try {
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
      } catch (error) {
        setLocalErrorNotice(toLocalNotice(error))
        throw error
      }
    },
    [modelSelection, stream, toolPolicy, workspaceThread?.appThreadId]
  )

  const resume = useCallback(
    async (
      decisions: Parameters<LangGraphChatStreamContextValue["resume"]>[0]
    ) => {
      if (stream.isLoading || isResumePendingRef.current) {
        return
      }

      const context = buildSubmitContext(
        modelSelection,
        toolPolicy,
        workspaceThread?.appThreadId
      )

      setLocalErrorNotice(null)
      isResumePendingRef.current = true
      setIsResumePending(true)

      try {
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
      } catch (error) {
        setLocalErrorNotice(toLocalNotice(error))
      } finally {
        isResumePendingRef.current = false
        setIsResumePending(false)
      }
    },
    [modelSelection, stream, toolPolicy, workspaceThread?.appThreadId]
  )

  const resetChat = useCallback(async () => {
    if (stream.isLoading) {
      await stream.stop({ cancel: true })
    }
    setThreadId(null)
    toolPolicy.resetToDefault()
  }, [stream, toolPolicy])

  const value = useMemo<LangGraphChatStreamContextValue>(() => {
    return {
      tools,
      models,
      modelSelection,
      toolPolicy,
      threadId: stream.threadId ?? activeThreadId,
      messages: stream.messages,
      toolCalls: stream.toolCalls,
      hitlInterrupts,
      localNotice,
      isBusy: stream.isLoading || isResumePending,
      isHydrating: stream.isThreadLoading,
      hasPendingInterrupt: hitlInterrupts.length > 0,
      streamStatus: stream.isLoading || isResumePending ? "streaming" : "idle",
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
    activeThreadId,
    stream.messages,
    stream.toolCalls,
    hitlInterrupts,
    stream.isLoading,
    stream.isThreadLoading,
    isResumePending,
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
