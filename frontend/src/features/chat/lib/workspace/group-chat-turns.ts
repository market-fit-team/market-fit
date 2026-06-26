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
      toolResults: ChatTurnToolResult[]
      textContent: string | null
      reasoning: string | null
      representativeMessageId: string | undefined
      artifacts: ArtifactResponse[]
      documents: DocumentResponse[]
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

const buildAssistantTurn = ({
  messages,
  toolCalls,
  artifacts,
  documents,
  index,
}: {
  messages: BaseMessage[]
  toolCalls: AssembledToolCall[]
  artifacts: ArtifactResponse[]
  documents: DocumentResponse[]
  index: number
}): ChatGroupedTurn | null => {
  const aiMessages = messages.filter((message): message is AIMessage =>
    AIMessage.isInstance(message)
  )

  if (aiMessages.length === 0) {
    return null
  }

  const textContent =
    aiMessages
      .map((message) => message.text)
      .filter((text) => typeof text === "string" && text.trim().length > 0)
      .join("\n\n")
      .trim() || null

  const reasoning =
    aiMessages
      .map(getReasoningText)
      .filter((value): value is string => typeof value === "string")
      .join("\n\n")
      .trim() || null

  const aiMessageIds = new Set(
    aiMessages
      .map((message) => message.id)
      .filter((id): id is string => typeof id === "string")
  )
  const rawToolCalls = aiMessages.flatMap((message) => message.tool_calls ?? [])
  const toolResultIds = new Set(
    messages
      .filter((message): message is ToolMessage =>
        ToolMessage.isInstance(message)
      )
      .map((message) => message.tool_call_id)
      .filter((id): id is string => typeof id === "string")
  )
  const relatedToolMessages = messages.filter(
    (message): message is ToolMessage =>
      ToolMessage.isInstance(message) &&
      typeof message.tool_call_id === "string" &&
      toolResultIds.has(message.tool_call_id)
  )
  const toolMessagesByCallId = new Map(
    relatedToolMessages
      .filter(
        (message): message is ToolMessage & { tool_call_id: string } =>
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
  const relatedToolCallIds = new Set(
    rawToolCalls
      .map((toolCall) => toolCall.id)
      .filter((id): id is string => typeof id === "string")
  )
  const toolResults = rawToolCalls.map((toolCall) => {
    const callId = toolCall.id
    const assembledToolCall =
      typeof callId === "string"
        ? assembledToolCallsById.get(callId)
        : undefined
    const toolMessage =
      typeof callId === "string" ? toolMessagesByCallId.get(callId) : undefined

    return {
      callId,
      name: toolCall.name ?? "tool",
      status: assembledToolCall?.status,
      argsSummary: toSummaryText(toolCall.args),
      resultSummary: toSummaryText(
        toolMessage?.text ?? assembledToolCall?.output ?? toolMessage?.content
      ),
    } satisfies ChatTurnToolResult
  })

  const realArtifacts = artifacts.filter((artifact) => {
    return (
      (artifact.source_message_id != null &&
        aiMessageIds.has(artifact.source_message_id)) ||
      (artifact.source_tool_call_id != null &&
        relatedToolCallIds.has(artifact.source_tool_call_id))
    )
  })
  const syntheticArtifacts = relatedToolMessages
    .map((message) => tryParseJson(message.text))
    .filter(isSyntheticArtifactSource)
    .map(toSyntheticArtifact)
  const relatedArtifacts = [...realArtifacts]
  const relatedArtifactIds = new Set(
    realArtifacts.map((artifact) => artifact.id)
  )

  for (const artifact of syntheticArtifacts) {
    if (!relatedArtifactIds.has(artifact.id)) {
      relatedArtifacts.push(artifact)
      relatedArtifactIds.add(artifact.id)
    }
  }

  const realDocuments = documents.filter(
    (document) =>
      document.source_artifact_id != null &&
      relatedArtifactIds.has(document.source_artifact_id)
  )
  const syntheticDocuments = relatedToolMessages
    .map((message) => tryParseJson(message.text))
    .filter(isSyntheticDocumentSource)
    .map(toSyntheticDocument)
  const relatedDocuments = [...realDocuments]
  const relatedDocumentIds = new Set(
    realDocuments.map((document) => document.id)
  )

  for (const document of syntheticDocuments) {
    if (!relatedDocumentIds.has(document.id)) {
      relatedDocuments.push(document)
      relatedDocumentIds.add(document.id)
    }
  }

  const representativeMessageId = aiMessages.at(-1)?.id

  return {
    kind: "assistant",
    key: representativeMessageId ?? `assistant-turn-${index}`,
    aiMessages,
    toolCalls: toolCalls.filter((toolCall) => {
      const id = toolCall.callId ?? toolCall.id
      return typeof id === "string" && relatedToolCallIds.has(id)
    }),
    toolResults,
    textContent,
    reasoning,
    representativeMessageId,
    artifacts: relatedArtifacts,
    documents: relatedDocuments,
  }
}

export const groupChatTurns = ({
  messages,
  toolCalls,
  artifacts,
  documents,
}: {
  messages: BaseMessage[]
  toolCalls: AssembledToolCall[]
  artifacts: ArtifactResponse[]
  documents: DocumentResponse[]
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
      artifacts,
      documents,
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

  const renderedArtifactIds = new Set(
    turns.flatMap((turn) =>
      turn.kind === "assistant"
        ? turn.artifacts.map((artifact) => artifact.id)
        : []
    )
  )
  const ungroupedArtifacts = artifacts.filter(
    (artifact) => !renderedArtifactIds.has(artifact.id)
  )

  return {
    turns,
    ungroupedArtifacts,
  }
}
