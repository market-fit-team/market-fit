import type { BaseMessage } from "@langchain/core/messages"

interface SdkMessageContentProps {
  message: BaseMessage
}

export function SdkMessageContent({ message }: SdkMessageContentProps) {
  const text = message.text

  if (!text) {
    return null
  }

  return <p className="text-sm leading-6 whitespace-pre-wrap">{text}</p>
}
