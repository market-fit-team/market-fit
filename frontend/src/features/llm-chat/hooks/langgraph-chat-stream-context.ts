import { createContext } from "react"
import type {
  DefaultToolCall,
  Message,
  ToolProgress,
} from "@langchain/langgraph-sdk"
import type { ChatModelOption, ChatModelSelection } from "@/features/llm-chat/types/chat-model-selection"
import type {
  HitlDecision,
  HitlInterrupt,
} from "@/features/llm-chat/types/hitl-interrupt-payload"
import type { LlmChatStreamStatus } from "@/features/llm-chat/types/langgraph-chat-state"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import type { ToolPolicyState } from "@/features/llm-chat/types/tool-policy-state"

export type ChatModelSelectionControls = ChatModelSelection & {
  selectedModel: ChatModelOption
  selectModel: (modelId: string) => void
  selectReasoningEffort: (
    reasoningEffort: ChatModelSelection["reasoningEffort"]
  ) => void
}

export type ToolPolicyControls = ToolPolicyState & {
  toggleTool: (toolName: string) => void
  resetToDefault: () => void
}

export type LangGraphChatStreamContextValue = {
  tools: LlmToolDefinition[]
  models: ChatModelOption[]
  modelSelection: ChatModelSelectionControls
  toolPolicy: ToolPolicyControls
  threadId: string | null
  messages: Message<DefaultToolCall>[]
  toolProgress: ToolProgress[]
  hitlInterrupts: HitlInterrupt[]
  localNotice: string | null
  isBusy: boolean
  streamStatus: LlmChatStreamStatus
  sendMessage: (content: string) => Promise<void>
  resume: (decisions: HitlDecision[]) => Promise<void>
  resetChat: () => Promise<void>
}

export const LangGraphChatStreamContext =
  createContext<LangGraphChatStreamContextValue | null>(null)
