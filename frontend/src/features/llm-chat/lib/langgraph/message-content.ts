import type { BaseMessage } from "@langchain/core/messages"

export type LangGraphToolCallLike = {
  id?: string
  name: string
  args: unknown
}

export type LangGraphMessage = BaseMessage & {
  id?: string
  type?: string
  additional_kwargs?: Record<string, unknown>
  tool_calls?: LangGraphToolCallLike[]
  tool_call_id?: string
  status?: string
}

export const getMessageType = (message: BaseMessage): string => {
  const explicitType = (message as { type?: unknown }).type
  if (typeof explicitType === "string") {
    return explicitType
  }

  const getType = (message as { _getType?: () => string })._getType
  if (typeof getType === "function") {
    return getType.call(message)
  }

  return "unknown"
}

export const getThinkingText = (message: BaseMessage): string | null => {
  // DeepSeek/OpenAI-compatible reasoning 어댑터는 reasoning_content를 additional_kwargs에 보존합니다.
  // Protocol V2의 message projection은 BaseMessage 인스턴스로 조립되므로 구조적으로 접근합니다.
  // 근거:
  // https://api-docs.deepseek.com/guides/thinking_mode
  // https://docs.langchain.com/oss/python/langgraph/event-streaming
  const reasoning = (message as LangGraphMessage).additional_kwargs?.reasoning_content
  if (typeof reasoning === "string" && reasoning !== "") {
    return reasoning
  }
  return null
}

export const getMessageText = (message: Pick<BaseMessage, "content">): string => {
  if (typeof message.content === "string") {
    return message.content
  }

  return message.content
    .map((part) => {
      if (typeof part === "string") {
        return part
      }

      if (part.type === "text") {
        return part.text
      }

      if (part.type === "image_url") {
        const imageUrl = (part as { image_url?: unknown }).image_url
        if (typeof imageUrl === "string") {
          return imageUrl
        }
        if (typeof imageUrl === "object" && imageUrl !== null) {
          const url = (imageUrl as { url?: unknown }).url
          return typeof url === "string" ? url : ""
        }
        return ""
      }

      if (part.type === "reasoning") {
        const reasoning = (part as { reasoning?: unknown }).reasoning
        return typeof reasoning === "string" ? reasoning : ""
      }

      return ""
    })
    .filter(Boolean)
    .join("\n")
}
