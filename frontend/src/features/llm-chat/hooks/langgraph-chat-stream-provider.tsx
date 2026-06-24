import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useStream } from "@langchain/react"
import { authClient } from "@/features/auth/lib/auth-client"
import { AUTHENTIK_PROVIDER_ID } from "@/features/auth/lib/auth-constants"
import {
  type ChatTurnOptions,
  LangGraphChatStreamContext,
  type LangGraphChatStreamContextValue,
} from "@/features/llm-chat/hooks/langgraph-chat-stream-context"
import { buildSubmitContext } from "@/features/llm-chat/lib/langgraph/build-submit-config"
import { buildSubmitInput } from "@/features/llm-chat/lib/langgraph/build-submit-input"
import type {
  HitlInterrupt,
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
  initialValues?: LlmChatGraphState
  workspaceThread?: {
    appThreadId: string
    langgraphThreadId: string
  } | null
}

type AccessTokenResult = {
  accessToken?: string
  data?: {
    accessToken?: string
  }
}

const extractAccessToken = (result: AccessTokenResult | null | undefined) => {
  return result?.accessToken ?? result?.data?.accessToken
}

const normalizeStreamErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

const isAlreadyConsumedInterruptError = (message: string) => {
  const normalized = message.toLowerCase()
  return (
    normalized.includes("already-consumed interrupt") ||
    normalized.includes("already consumed interrupt")
  )
}

const toLocalNotice = (error: unknown) => {
  const message = normalizeStreamErrorMessage(error)

  if (message.includes("HTTP 401")) {
    return "오류: 로그인 세션을 확인하지 못했습니다. 다시 로그인한 뒤 채팅을 이어가 주세요."
  }

  if (isAlreadyConsumedInterruptError(message)) {
    return "오류: 이미 처리된 승인 요청입니다. 최신 대화 상태를 다시 불러온 뒤 이어가 주세요."
  }

  return `오류: ${message}`
}

const buildInterruptSignature = (interrupts: HitlInterrupt[]) => {
  return interrupts
    .map((interrupt, index) => `${index}:${JSON.stringify(interrupt)}`)
    .join("|")
}

const langGraphFetch: typeof fetch = async (input, init) => {
  const headers = new Headers(withCsrfHeaders(init?.headers))
  const result = (await authClient.getAccessToken({
    providerId: AUTHENTIK_PROVIDER_ID,
  })) as AccessTokenResult
  const accessToken = extractAccessToken(result)

  if (!accessToken) {
    throw new Error("로그인 세션의 access token을 확인하지 못했습니다.")
  }

  headers.set("authorization", `Bearer ${accessToken}`)

  return fetch(input, {
    ...init,
    headers,
  })
}

export function LangGraphChatStreamProvider({
  children,
  tools,
  models,
  modelSelection,
  toolPolicy,
  initialValues,
  workspaceThread,
}: LangGraphChatStreamProviderProps) {
  const [threadId, setThreadId] = useState<string | null>(
    workspaceThread?.langgraphThreadId ?? null
  )
  const latestTurnOptionsRef = useRef<ChatTurnOptions>({})
  const activeThreadId = workspaceThread?.langgraphThreadId ?? threadId
  const [localErrorNotice, setLocalErrorNotice] = useState<string | null>(null)
  const [dismissedInterruptSignature, setDismissedInterruptSignature] =
    useState<string | null>(null)

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
    // 이 hook은 built-in SSE transport로 /stream/events + /commands를 사용하며,
    // messages/toolCalls/interrupts projection을 직접 제공합니다.
    // 근거:
    // https://reference.langchain.com/javascript/langchain-react/use-stream
    // https://github.com/langchain-ai/langgraphjs/blob/main/libs/sdk/CHANGELOG.md
    apiUrl,
    assistantId: "chat",
    fetch: langGraphFetch,
    messagesKey: "messages",
    initialValues,
    optimistic: true,
    transport: "sse",
    threadId: activeThreadId,
    onThreadId: workspaceThread ? undefined : setThreadId,
  })

  const interruptSignature = useMemo(
    () => buildInterruptSignature(stream.interrupts),
    [stream.interrupts]
  )
  const hitlInterrupts = useMemo(() => {
    return dismissedInterruptSignature &&
      dismissedInterruptSignature === interruptSignature
      ? []
      : stream.interrupts
  }, [dismissedInterruptSignature, interruptSignature, stream.interrupts])
  const streamErrorNotice = stream.error ? toLocalNotice(stream.error) : null
  const localNotice = localErrorNotice ?? streamErrorNotice

  useEffect(() => {
    if (
      interruptSignature &&
      dismissedInterruptSignature &&
      dismissedInterruptSignature !== interruptSignature
    ) {
      setDismissedInterruptSignature(null)
    }
  }, [dismissedInterruptSignature, interruptSignature])

  const sendMessage = useCallback(
    async (content: string, options: ChatTurnOptions = {}) => {
      const trimmed = content.trim()
      if (!trimmed || stream.isLoading) {
        return
      }
      latestTurnOptionsRef.current = {
        selectedDocumentIds: options.selectedDocumentIds,
        selectedArtifactIds: options.selectedArtifactIds,
      }
      setLocalErrorNotice(null)

      const context = buildSubmitContext(
        modelSelection,
        toolPolicy,
        workspaceThread?.appThreadId,
        options.selectedDocumentIds,
        options.selectedArtifactIds
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
      if (stream.isLoading) {
        return
      }

      const context = buildSubmitContext(
        modelSelection,
        toolPolicy,
        workspaceThread?.appThreadId,
        latestTurnOptionsRef.current.selectedDocumentIds,
        latestTurnOptionsRef.current.selectedArtifactIds
      )

      setLocalErrorNotice(null)

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
        const notice = toLocalNotice(error)
        if (
          isAlreadyConsumedInterruptError(normalizeStreamErrorMessage(error))
        ) {
          setDismissedInterruptSignature(interruptSignature)
        }
        setLocalErrorNotice(notice)
      }
    },
    [
      interruptSignature,
      modelSelection,
      stream,
      toolPolicy,
      workspaceThread?.appThreadId,
    ]
  )

  const resetChat = useCallback(async () => {
    if (stream.isLoading) {
      await stream.stop({ cancel: true })
    }
    setThreadId(null)
    latestTurnOptionsRef.current = {}
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
    activeThreadId,
    stream.messages,
    stream.toolCalls,
    hitlInterrupts,
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
