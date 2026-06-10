import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"
import { ChatHero } from "@/features/llm-chat/page/components/chat-hero"

export function ChatHeroPanel() {
  const { threadId, isBusy, resetChat } = useLangGraphChatStream()

  return <ChatHero threadId={threadId} isBusy={isBusy} onReset={resetChat} />
}
