import { createContext } from "react"
import type { BaseMessage } from "@langchain/core/messages"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import type {
  ChatModelOption,
  ChatModelSelection,
} from "@/features/llm-chat/types/chat-model-selection"
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

export type ChatTurnOptions = {
  selectedDocumentIds?: string[]
  selectedArtifactIds?: string[]
}

export type LangGraphChatStreamContextValue = {
  tools: LlmToolDefinition[]
  models: ChatModelOption[]
  modelSelection: ChatModelSelectionControls
  toolPolicy: ToolPolicyControls
  threadId: string | null
  messages: BaseMessage[]
  // Protocol V2 공식 React hook(@langchain/react)은 tools 채널을 stream.toolCalls projection으로 제공합니다.
  // 기존 legacy SDK의 toolProgress는 /runs/stream 전제라 제거합니다.
  // 근거:
  // https://reference.langchain.com/javascript/langchain-react/use-stream
  // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-event-stream-sse
  toolCalls: AssembledToolCall[]
  hitlInterrupts: HitlInterrupt[]
  localNotice: string | null
  isBusy: boolean
  isHydrating: boolean
  hasPendingInterrupt: boolean
  streamStatus: LlmChatStreamStatus
  sendMessage: (content: string, options?: ChatTurnOptions) => Promise<void>
  resume: (decisions: HitlDecision[]) => Promise<void>
  resetChat: () => Promise<void>
}

export const LangGraphChatStreamContext =
  createContext<LangGraphChatStreamContextValue | null>(null)
