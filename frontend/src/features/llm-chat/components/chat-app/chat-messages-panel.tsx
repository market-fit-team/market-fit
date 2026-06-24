import { EmptyChatState } from "@/features/llm-chat/components/empty-chat-state"
import { HitlInterruptCard } from "@/features/llm-chat/components/hitl/hitl-interrupt-card"
import { SdkMessageList } from "@/features/llm-chat/components/messages/sdk-message-list"
import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function ChatMessagesPanel() {
  const {
    hitlInterrupts,
    isBusy,
    isHydrating,
    localNotice,
    messages,
    resume,
    toolCalls,
  } = useLangGraphChatStream()

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-muted/20">
      {isHydrating ? (
        <div className="space-y-3 p-4">
          <Skeleton className="h-14 w-2/3 rounded-lg" />
          <Skeleton className="ml-auto h-14 w-1/2 rounded-lg" />
          <Skeleton className="h-24 w-3/4 rounded-lg" />
        </div>
      ) : messages.length === 0 &&
        !localNotice &&
        hitlInterrupts?.length === 0 ? (
        <EmptyChatState />
      ) : (
        <div className="h-full">
          <SdkMessageList messages={messages} toolCalls={toolCalls}>
            {(localNotice || hitlInterrupts?.length > 0) && (
              <div className="space-y-3 pb-4">
                {localNotice && (
                  <Alert variant="destructive">
                    <AlertDescription>{localNotice}</AlertDescription>
                  </Alert>
                )}
                {hitlInterrupts?.length > 0 && (
                  <HitlInterruptCard
                    interrupts={hitlInterrupts}
                    disabled={isBusy || isHydrating}
                    onDecide={(decisions) => void resume(decisions)}
                  />
                )}
              </div>
            )}
          </SdkMessageList>
        </div>
      )}
    </section>
  )
}
