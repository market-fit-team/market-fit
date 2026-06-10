import type { BaseMessage } from "@langchain/core/messages"

export type LlmChatGraphState = {
  messages: BaseMessage[]
}

export type LlmChatStreamStatus = "idle" | "streaming"
