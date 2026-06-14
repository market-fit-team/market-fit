import { ChatComposerPanel } from "@/features/llm-chat/components/chat-app/components/chat-composer-panel"
import { ChatHeroPanel } from "@/features/llm-chat/components/chat-app/components/chat-hero-panel"
import { ChatMessagesPanel } from "@/features/llm-chat/components/chat-app/components/chat-messages-panel"
import { LangGraphChatStreamProvider } from "@/features/llm-chat/hooks/langgraph-chat-stream-provider"
import { useChatModelSelection } from "@/features/llm-chat/hooks/use-chat-model-selection"
import { useToolPolicy } from "@/features/llm-chat/hooks/use-tool-policy"
import {
  useListLlmModelsApiV1LlmModelsGetSuspense,
  useListLlmToolsApiV1LlmToolsGetSuspense,
} from "@/shared/api/generated/agent/endpoints/llm/llm"
import { Skeleton } from "@/shared/components/ui/skeleton"

export function ChatApp() {
  const { data: tools } = useListLlmToolsApiV1LlmToolsGetSuspense({
    query: {
      select: (data) =>
        data.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          category: tool.category,
          defaultAllowed: tool.default_allowed,
          allowedDecisions: tool.allowed_decisions,
        })),
    },
  })
  const { data: models } = useListLlmModelsApiV1LlmModelsGetSuspense({
    query: {
      select: (data) =>
        data.list.map((model) => ({
          id: model.id,
          object: model.object,
          created: model.created,
          supportedReasoningEfforts: model.supported_reasoning_efforts,
        })),
    },
  })

  const toolPolicy = useToolPolicy(tools)
  const modelSelection = useChatModelSelection(models)

  return (
    <LangGraphChatStreamProvider
      tools={tools}
      models={models}
      modelSelection={modelSelection}
      toolPolicy={toolPolicy}
    >
      <ChatHeroPanel />
      <ChatMessagesPanel />
      <ChatComposerPanel />
    </LangGraphChatStreamProvider>
  )
}

export function ChatAppSkeleton() {
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
