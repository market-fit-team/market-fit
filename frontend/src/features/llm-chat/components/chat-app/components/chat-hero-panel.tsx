import { ChatHero } from "@/features/llm-chat/components/chat-app/components/chat-hero"
import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"

export function ChatHeroPanel() {
  const { threadId, isBusy, resetChat } = useLangGraphChatStream()

  return <ChatHero threadId={threadId} isBusy={isBusy} onReset={resetChat} />
}
