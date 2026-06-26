import {
  AIMessage,
  type BaseMessage,
  HumanMessage,
  ToolMessage,
} from "@langchain/core/messages"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import type {
  ArtifactResponse,
  DocumentResponse,
} from "@/shared/api/generated/agent/schemas"

const ARTIFACT_CARD_TOOL_NAMES = new Set(["artifact_create", "artifact_update"])
const DOCUMENT_CARD_TOOL_NAMES = new Set([
  "artifact_save_as_document",
  "document_create",
  "document_update",
])

type SyntheticArtifactSource = Pick<
  ArtifactResponse,
  | "id"
  | "thread_id"
  | "type"
  | "title"
  | "summary"
  | "raw_text"
  | "version"
  | "source_message_id"
  | "source_tool_call_id"
>

type SyntheticDocumentSource = Pick<
  DocumentResponse,
  "id" | "type" | "title" | "summary" | "raw_text" | "source_artifact_id"
>

export type ChatTurnToolResult = {
  callId: string | undefined
  name: string
  status: string | undefined
  argsSummary: string | null
  resultSummary: string | null
}

export type ChatTurnToolCard =
  | {
      kind: "artifact"
      artifact: ArtifactResponse
    }
  | {
      kind: "library-document"
      document: DocumentResponse
    }

export type ChatAssistantTurnItem =
  | {
      kind: "text"
      key: string
      text: string
    }
  | {
      kind: "tool-call"
      key: string
      toolCallId: string | undefined
      toolCallName: string
      toolCall: AssembledToolCall | undefined
      toolResult: ChatTurnToolResult
      cards: ChatTurnToolCard[]
    }

export type ChatGroupedTurn =
  | {
      kind: "user"
      key: string
      message: BaseMessage
    }
  | {
      kind: "assistant"
      key: string
      aiMessages: AIMessage[]
      toolCalls: AssembledToolCall[]
      reasoning: string | null
      representativeMessageId: string | undefined
      items: ChatAssistantTurnItem[]
    }

const getReasoningText = (message: AIMessage) => {
  const reasoning = message.contentBlocks
    .flatMap((block) => (block.type === "reasoning" ? [block.reasoning] : []))
    .join("")

  return reasoning || null
}

const tryParseJson = (value: string) => {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

const toSummaryText = (value: unknown) => {
  if (value == null) {
    return null
  }

  if (typeof value === "string") {
    return value.trim() || null
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const isSyntheticArtifactSource = (
  value: unknown
): value is SyntheticArtifactSource => {
  if (typeof value !== "object" || value == null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === "string" &&
    typeof candidate.thread_id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.raw_text === "string" &&
    typeof candidate.version === "number"
  )
}

const isSyntheticDocumentSource = (
  value: unknown
): value is SyntheticDocumentSource => {
  if (typeof value !== "object" || value == null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === "string" &&
    typeof candidate.type === "string" &&
    typeof candidate.raw_text === "string"
  )
}

const toSyntheticArtifact = (
  value: SyntheticArtifactSource
): ArtifactResponse => {
  const now = new Date().toISOString()

  return {
    id: value.id,
    thread_id: value.thread_id,
    langgraph_thread_id: "",
    source_message_id: value.source_message_id ?? null,
    source_tool_call_id: value.source_tool_call_id ?? null,
    type: value.type,
    title: value.title ?? null,
    summary: value.summary ?? null,
    raw_text: value.raw_text,
    version: value.version,
    created_at: now,
    updated_at: now,
  }
}

const toSyntheticDocument = (
  value: SyntheticDocumentSource
): DocumentResponse => {
  const now = new Date().toISOString()

  return {
    id: value.id,
    type: value.type,
    title: value.title ?? null,
    summary: value.summary ?? null,
    raw_text: value.raw_text,
    source_artifact_id: value.source_artifact_id ?? null,
    created_at: now,
    updated_at: now,
  }
}

const buildToolCards = ({
  toolCallName,
  toolMessageText,
}: {
  toolCallName: string
  toolMessageText: string | undefined
}): ChatTurnToolCard[] => {
  if (typeof toolMessageText !== "string") {
    return []
  }

  const parsed = tryParseJson(toolMessageText)

  if (
    ARTIFACT_CARD_TOOL_NAMES.has(toolCallName) &&
    isSyntheticArtifactSource(parsed)
  ) {
    return [
      {
        kind: "artifact",
        artifact: toSyntheticArtifact(parsed),
      },
    ]
  }

  if (
    DOCUMENT_CARD_TOOL_NAMES.has(toolCallName) &&
    isSyntheticDocumentSource(parsed)
  ) {
    return [
      {
        kind: "library-document",
        document: toSyntheticDocument(parsed),
      },
    ]
  }

  return []
}

const buildAssistantTurn = ({
  messages,
  toolCalls,
  index,
}: {
  messages: BaseMessage[]
  toolCalls: AssembledToolCall[]
  index: number
}): ChatGroupedTurn | null => {
  const aiMessages = messages.filter((message): message is AIMessage =>
    AIMessage.isInstance(message)
  )

  if (aiMessages.length === 0) {
    return null
  }

  const reasoning =
    aiMessages
      .map(getReasoningText)
      .filter((value): value is string => typeof value === "string")
      .join("\n\n")
      .trim() || null

  const toolMessagesByCallId = new Map(
    messages
      .filter(
        (message): message is ToolMessage & { tool_call_id: string } =>
          ToolMessage.isInstance(message) &&
          typeof message.tool_call_id === "string"
      )
      .map((message) => [message.tool_call_id, message] as const)
  )
  const assembledToolCallsById = new Map(
    toolCalls
      .map((toolCall) => {
        const id = toolCall.callId ?? toolCall.id
        return typeof id === "string" ? ([id, toolCall] as const) : null
      })
      .filter(
        (value): value is readonly [string, AssembledToolCall] => value !== null
      )
  )

  const relatedToolCallIds = new Set<string>()
  const items: ChatAssistantTurnItem[] = []

  messages.forEach((message, messageIndex) => {
    if (!AIMessage.isInstance(message)) {
      return
    }

    const text = message.text?.trim()
    if (text) {
      items.push({
        kind: "text",
        key: `${message.id ?? `assistant-${index}-${messageIndex}`}-text`,
        text,
      })
    }

    ;(message.tool_calls ?? []).forEach((toolCall, toolCallIndex) => {
      const callId = toolCall.id
      const toolCallName = toolCall.name ?? "tool"
      if (typeof callId === "string") {
        relatedToolCallIds.add(callId)
      }

      const assembledToolCall =
        typeof callId === "string"
          ? assembledToolCallsById.get(callId)
          : undefined
      const toolMessage =
        typeof callId === "string" ? toolMessagesByCallId.get(callId) : undefined

      items.push({
        kind: "tool-call",
        key:
          callId ??
          `${message.id ?? `assistant-${index}-${messageIndex}`}-${toolCallName}-${toolCallIndex}`,
        toolCallId: callId,
        toolCallName,
        toolCall: assembledToolCall,
        toolResult: {
          callId,
          name: toolCallName,
          status: assembledToolCall?.status,
          argsSummary: toSummaryText(toolCall.args),
          resultSummary: toSummaryText(
            toolMessage?.text ?? assembledToolCall?.output ?? toolMessage?.content
          ),
        },
        cards: buildToolCards({
          toolCallName,
          toolMessageText: toolMessage?.text,
        }),
      })
    })
  })

  const representativeMessageId = aiMessages.at(-1)?.id

  return {
    kind: "assistant",
    key: representativeMessageId ?? `assistant-turn-${index}`,
    aiMessages,
    toolCalls: toolCalls.filter((toolCall) => {
      const id = toolCall.callId ?? toolCall.id
      return typeof id === "string" && relatedToolCallIds.has(id)
    }),
    reasoning,
    representativeMessageId,
    items,
  }
}

export const groupChatTurns = ({
  messages,
  toolCalls,
}: {
  messages: BaseMessage[]
  toolCalls: AssembledToolCall[]
}) => {
  const turns: ChatGroupedTurn[] = []
  const assistantBuffer: BaseMessage[] = []
  let assistantTurnIndex = 0

  const flushAssistantBuffer = () => {
    if (assistantBuffer.length === 0) {
      return
    }

    const turn = buildAssistantTurn({
      messages: assistantBuffer,
      toolCalls,
      index: assistantTurnIndex,
    })

    assistantTurnIndex += 1
    assistantBuffer.length = 0

    if (turn != null) {
      turns.push(turn)
    }
  }

  for (const message of messages) {
    if (HumanMessage.isInstance(message)) {
      flushAssistantBuffer()
      turns.push({
        kind: "user",
        key: message.id ?? `user-turn-${turns.length}`,
        message,
      })
      continue
    }

    assistantBuffer.push(message)
  }

  flushAssistantBuffer()

  return {
    turns,
  }
}
