import { useContext } from "react"
import { LangGraphChatStreamContext } from "@/features/llm-chat/hooks/langgraph-chat-stream-context"

export function useLangGraphChatStream() {
  const context = useContext(LangGraphChatStreamContext)
  if (!context) {
    throw new Error("LangGraphChatStreamProvider가 필요합니다.")
  }
  return context
}
