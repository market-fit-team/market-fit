import type { Message } from "@langchain/langgraph-sdk"

export const getThinkingText = (
  message: Pick<Message, "additional_kwargs">
): string | null => {
  const reasoning = message.additional_kwargs?.reasoning_content
  if (typeof reasoning === "string" && reasoning !== "") {
    return reasoning
  }
  return null
}

export const getMessageText = (message: Pick<Message, "content">): string => {
  if (typeof message.content === "string") {
    return message.content
  }

  return message.content
    .map((part) => {
      if (part.type === "text") {
        return part.text
      }
      if (part.type === "image_url") {
        const imageUrl = part.image_url
        return typeof imageUrl === "string" ? imageUrl : imageUrl.url
      }
      return ""
    })
    .filter(Boolean)
    .join("\n")
}
