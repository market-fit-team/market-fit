import type { ChatModelSelection } from "@/features/llm-chat/types/chat-model-selection"
import type { ToolPolicyState } from "@/features/llm-chat/types/tool-policy-state"

export const DEFAULT_LANGGRAPH_STREAM_MODE = [
  "values",
  "messages",
  "tools",
  "updates",
] as const

export type LangGraphChatContext = {
  model: string
  reasoning_effort: string
  allowed_tools: string[]
  interrupt_on: ToolPolicyState["interruptOn"]
}

export const buildSubmitContext = (
  modelSelection: ChatModelSelection,
  toolPolicy: ToolPolicyState
): LangGraphChatContext => ({
  model: modelSelection.model,
  reasoning_effort: modelSelection.reasoningEffort,
  allowed_tools: toolPolicy.allowedTools,
  interrupt_on: toolPolicy.interruptOn,
})
