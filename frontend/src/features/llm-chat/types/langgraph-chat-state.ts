import type {
  DefaultToolCall,
  Message,
} from "@langchain/langgraph-sdk"

export type LlmChatGraphState = {
  messages: Message<DefaultToolCall>[]
}

export type LlmChatStreamStatus = "idle" | "streaming"
