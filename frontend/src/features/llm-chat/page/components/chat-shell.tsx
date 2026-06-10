import { Suspense } from "react"
import { LangGraphChatStreamProvider } from "@/features/llm-chat/hooks/langgraph-chat-stream-provider"
import { useChatModelSelection } from "@/features/llm-chat/hooks/use-chat-model-selection"
import { useToolPolicy } from "@/features/llm-chat/hooks/use-tool-policy"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import { ChatComposerPanel } from "@/features/llm-chat/page/components/chat-composer-panel"
import { ChatHeroPanel } from "@/features/llm-chat/page/components/chat-hero-panel"
import { ChatMessagesPanel } from "@/features/llm-chat/page/components/chat-messages-panel"
import {
  useListAgentModelsSuspense,
  useListAgentToolsSuspense,
} from "@/features/llm-chat/lib/agent-catalog/use-agent-catalog"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function ChatShell() {
  return (
    <Suspense fallback={<ChatShellSkeleton />}>
      <ChatShellBase />
    </Suspense>
  )
}

function ChatShellBase() {
  const toolsQuery = useListAgentToolsSuspense()
  const modelsQuery = useListAgentModelsSuspense()
  const tools: LlmToolDefinition[] = toolsQuery.data
  const models = modelsQuery.data
  const toolPolicy = useToolPolicy(tools)
  const modelSelection = useChatModelSelection(models)

  return (
    <LangGraphChatStreamProvider
      tools={tools}
      models={models}
      modelSelection={modelSelection}
      toolPolicy={toolPolicy}
    >
      <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-4xl flex-col overflow-hidden border-x border-border/60 bg-background">
        <ChatHeroPanel />
        <ChatMessagesPanel />
        <ChatComposerPanel />
      </div>
    </LangGraphChatStreamProvider>
  )
}

function ChatShellSkeleton() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-4xl flex-col overflow-hidden border-x border-border/60 bg-background">
      <div className="border-b border-border bg-background/95 px-4 py-3">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
      <div className="min-h-0 flex-1 bg-muted/20 px-6 py-8">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
      <div className="border-t border-border bg-background/95 p-3">
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  )
}
