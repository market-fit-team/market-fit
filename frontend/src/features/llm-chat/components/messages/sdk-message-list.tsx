import { useEffect } from "react"
import type {
  DefaultToolCall,
  Message,
  ToolProgress,
} from "@langchain/langgraph-sdk"
import { SdkMessageItem } from "@/features/llm-chat/components/messages/sdk-message-item"
import { useAutoScroll } from "@/features/llm-chat/hooks/use-auto-scroll"
import { ScrollArea } from "@/shared/components/ui/scroll-area"

interface SdkMessageListProps {
  messages: Message<DefaultToolCall>[]
  toolProgress: ToolProgress[]
  children?: React.ReactNode
}

export function SdkMessageList({
  messages,
  toolProgress,
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
    <ScrollArea
      className="h-full"
      viewportRef={viewportRef}
      onScroll={onScroll}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
        {messages.map((message, index) => {
          const isLastMessage = index === messages.length - 1
          return (
            <SdkMessageItem
              key={message.id ?? `${message.type}-${index}`}
              message={message}
              messages={messages}
              toolProgress={toolProgress}
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
