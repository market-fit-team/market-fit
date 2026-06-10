import type {
  AIMessage,
  DefaultToolCall,
  Message,
  ToolMessage,
  ToolProgress,
} from "@langchain/langgraph-sdk"
import { getMessageText } from "@/features/llm-chat/lib/langgraph/message-content"

export type SdkToolCallViewModel = {
  id: string
  name: string
  input: unknown
  output: unknown
  error: unknown
  state: "pending" | "completed" | "error"
}

const isToolMessage = (
  message: Message<DefaultToolCall>
): message is ToolMessage => message.type === "tool"

const findToolResult = (
  messages: Message<DefaultToolCall>[],
  toolCallId: string
) =>
  messages.find(
    (message): message is ToolMessage =>
      isToolMessage(message) && message.tool_call_id === toolCallId
  )

const findToolProgress = (
  toolProgress: ToolProgress[],
  toolCallId: string
) => toolProgress.find((progress) => progress.toolCallId === toolCallId)

const getToolOutput = (
  result: ToolMessage | undefined,
  progress?: ToolProgress
) => {
  if (result) {
    return getMessageText(result)
  }

  return progress?.result ?? progress?.data
}

export const buildToolCallViewModels = (
  aiMessage: AIMessage<DefaultToolCall>,
  messages: Message<DefaultToolCall>[],
  toolProgress: ToolProgress[]
): SdkToolCallViewModel[] => {
  return (aiMessage.tool_calls ?? []).map((call, index) => {
    const id = call.id ?? `${aiMessage.id ?? "ai"}-${index}`
    const result = findToolResult(messages, id)
    const progress = findToolProgress(toolProgress, id)
    const state =
      result?.status === "error" || progress?.state === "error"
        ? "error"
        : result || progress?.state === "completed"
          ? "completed"
          : "pending"

    return {
      id,
      name: call.name,
      input: call.args,
      output: getToolOutput(result, progress),
      error: progress?.error,
      state,
    }
  })
}
