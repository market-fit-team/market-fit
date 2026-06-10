import type { ChatModelSelection } from "@/features/llm-chat/types/chat-model-selection"
import type { ToolPolicyState } from "@/features/llm-chat/types/tool-policy-state"

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
  // Protocol V2 @langchain/react submit/respond는 run.start/input.respond command의
  // config.configurable로 실행 context를 전달합니다. 서버 graph는 Runtime.context에서 이 값을 읽습니다.
  // 근거:
  // https://docs.langchain.com/langsmith/agent-server-api/streaming/protocol-v2-command
  // https://reference.langchain.com/python/langgraph/runtime/Runtime
  model: modelSelection.model,
  reasoning_effort: modelSelection.reasoningEffort,
  allowed_tools: toolPolicy.allowedTools,
  interrupt_on: toolPolicy.interruptOn,
})
