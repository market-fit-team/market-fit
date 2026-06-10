import { useEffect } from "react"
import type { BaseMessage } from "@langchain/core/messages"
import type { AssembledToolCall } from "@langchain/langgraph-sdk/stream"
import { SdkMessageItem } from "@/features/llm-chat/components/messages/sdk-message-item"
import { useAutoScroll } from "@/features/llm-chat/hooks/use-auto-scroll"
import { ScrollArea } from "@/shared/components/ui/scroll-area"

interface SdkMessageListProps {
  messages: BaseMessage[]
  toolCalls: AssembledToolCall[]
  children?: React.ReactNode
}

export function SdkMessageList({
  messages,
  toolCalls,
  children,
}: SdkMessageListProps) {
  const { viewportRef, onScroll, scrollToBottom } = useAutoScroll()
  const lastMessageId = messages.at(-1)?.id

  useEffect(() => {
    // 완전히 새로운 메시지가 추가되었을 때는 강제로 하단 스크롤
    if (children || lastMessageId) {
      scrollToBottom(true)
    }
  }, [lastMessageId, scrollToBottom, children])

  return (
    <ScrollArea className="h-full" ref={viewportRef} onScroll={onScroll}>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1
          return (
            <SdkMessageItem
              key={message.id ?? `${message._getType()}-${index}`}
              message={message}
              messages={messages}
              toolCalls={toolCalls}
              isLastMessage={isLastMessage}
              onSizeChange={scrollToBottom}
            />
          )
        })}
        {/* 인터럽트창 영역 */}
        {children}
      </div>
    </ScrollArea>
  )
}
