import type { BaseMessage } from "@langchain/core/messages"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import {
  getMessageText,
  getMessageType,
  type LangGraphMessage,
} from "@/features/llm-chat/lib/langgraph/message-content"

export type SdkToolCallViewModel = {
  id: string
  name: string
  input: unknown
  output: unknown
  error: unknown
  state: "pending" | "completed" | "error"
}

const isToolMessage = (message: BaseMessage): message is LangGraphMessage =>
  getMessageType(message) === "tool"

const findToolResult = (messages: BaseMessage[], toolCallId: string) =>
  messages.find(
    (message): message is LangGraphMessage =>
      isToolMessage(message) && message.tool_call_id === toolCallId
  )

const findAssembledToolCall = (
  toolCalls: AssembledToolCall[],
  toolCallId: string
) => toolCalls.find((toolCall) => toolCall.callId === toolCallId || toolCall.id === toolCallId)

const getToolOutput = (
  result: LangGraphMessage | undefined,
  assembled?: AssembledToolCall
) => {
  if (result) {
    return getMessageText(result)
  }

  return assembled?.output
}

export const buildToolCallViewModels = (
  aiMessage: LangGraphMessage,
  messages: BaseMessage[],
  toolCalls: AssembledToolCall[]
): SdkToolCallViewModel[] => {
  // Protocol V2에서는 tools 채널이 @langchain/react의 stream.toolCalls projection으로 조립됩니다.
  // AIMessage.tool_calls는 values/messages snapshot에서 온 호출 선언이고, assembled tool call은 실행 상태/결과입니다.
  // 근거:
  // https://reference.langchain.com/javascript/langchain-react/use-stream
  // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
  return (aiMessage.tool_calls ?? []).map((call, index) => {
    const id = call.id ?? `${aiMessage.id ?? "ai"}-${index}`
    const result = findToolResult(messages, id)
    const assembled = findAssembledToolCall(toolCalls, id)
    const state =
      result?.status === "error" || assembled?.status === "error"
        ? "error"
        : result || assembled?.status === "finished"
          ? "completed"
          : "pending"

    return {
      id,
      name: call.name,
      input: call.args,
      output: getToolOutput(result, assembled),
      error: assembled?.error,
      state,
    }
  })
}
