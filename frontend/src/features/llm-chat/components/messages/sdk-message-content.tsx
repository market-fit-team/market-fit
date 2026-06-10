import type { BaseMessage } from "@langchain/core/messages"
import { getMessageText } from "@/features/llm-chat/lib/langgraph/message-content"

interface SdkMessageContentProps {
  message: BaseMessage
}

export function SdkMessageContent({ message }: SdkMessageContentProps) {
  const text = getMessageText(message)

  if (!text) {
    return null
  }

  return (
    <p className="whitespace-pre-wrap text-sm leading-6">
      {text}
    </p>
  )
}
