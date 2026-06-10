import { useEffect, useRef } from "react"
import { ChevronDown } from "lucide-react"
import type {
  AIMessage,
  DefaultToolCall,
  Message,
  ToolProgress,
} from "@langchain/langgraph-sdk"
import { SdkMessageContent } from "@/features/llm-chat/components/messages/sdk-message-content"
import { SdkToolCallCard } from "@/features/llm-chat/components/messages/sdk-tool-call-card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible"
import { buildToolCallViewModels } from "@/features/llm-chat/lib/langgraph/build-tool-call-view-model"
import { getMessageText, getThinkingText } from "@/features/llm-chat/lib/langgraph/message-content"
import { cn } from "@/shared/utils"

interface SdkMessageItemProps {
  message: Message<DefaultToolCall>
  messages: Message<DefaultToolCall>[]
  toolProgress: ToolProgress[]
  isLastMessage?: boolean
  onSizeChange?: (force?: boolean) => void
}

const isAiMessage = (
  message: Message<DefaultToolCall>
): message is AIMessage<DefaultToolCall> => message.type === "ai"

const getLabel = (message: Message<DefaultToolCall>) => {
  switch (message.type) {
    case "human":
      return "사용자"
    case "ai":
      return "AI"
    case "tool":
      return "도구 결과"
    case "system":
      return "시스템"
    case "function":
      return "함수"
    case "remove":
      return "삭제됨"
  }
}

export function SdkMessageItem({
  message,
  messages,
  toolProgress,
  isLastMessage,
  onSizeChange,
}: SdkMessageItemProps) {
  const itemRef = useRef<HTMLElement>(null)
  const maxSeenHeight = useRef(0)

  useEffect(() => {
    const element = itemRef.current
    if (!isLastMessage || !element) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // 가능하면 borderBoxSize를 사용하고, 없으면 bounding rect 높이를 사용
        const currentHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height
        
        if (currentHeight > maxSeenHeight.current) {
          maxSeenHeight.current = currentHeight
          // 마크다운 렌더링 시 높이가 줄어들며 널뛰는 현상(Jittering)을 막기 위해 쪼그라듦 방지 잠금(Lock) 적용
          element.style.minHeight = `${currentHeight}px`
        }
        
        // 크기가 변할 때마다 하단으로 자동 스크롤 트리거
        onSizeChange?.()
      }
    })

    observer.observe(element)
    return () => {
      observer.disconnect()
      // 더 이상 마지막 메시지가 아니게 되면 스타일 초기화
      element.style.minHeight = ""
    }
  }, [isLastMessage, onSizeChange])

  if (message.type === "tool") {
    return null
  }

  const isUser = message.type === "human"
  const toolCalls = isAiMessage(message)
    ? buildToolCallViewModels(message, messages, toolProgress)
    : []
  const textContent = getMessageText(message)
  const thinkingContent = getThinkingText(message)
  const hasContent = Boolean(textContent) || Boolean(thinkingContent)

  return (
    <article
      ref={itemRef}
      className={cn(
        "flex flex-col gap-3",
        isUser ? "items-end" : "items-start"
      )}
    >
      {hasContent && (
        <div
          className={cn(
            "max-w-[86%] rounded-lg border px-4 py-3 shadow-sm",
            isUser
              ? "border-primary/40 bg-primary text-primary-foreground"
              : "border-border bg-card text-card-foreground"
          )}
        >
          <div className="mb-2 text-xs font-medium opacity-70">
            {getLabel(message)}
          </div>
          
          <div className="space-y-3">
            {thinkingContent && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="group flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ChevronDown className="size-3 transition-transform group-data-[state=closed]:-rotate-90" />
                  thinking
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 rounded-lg border border-border/70 bg-muted/40 p-3 text-sm leading-6 text-muted-foreground whitespace-pre-wrap">
                  {thinkingContent}
                </CollapsibleContent>
              </Collapsible>
            )}
            
            <SdkMessageContent message={message} />
          </div>
        </div>
      )}

      {toolCalls.length > 0 && (
        <div className="w-full max-w-[86%] space-y-3">
          {toolCalls.map((toolCall) => (
            <SdkToolCallCard key={toolCall.id} toolCall={toolCall} />
          ))}
        </div>
      )}
    </article>
  )
}
