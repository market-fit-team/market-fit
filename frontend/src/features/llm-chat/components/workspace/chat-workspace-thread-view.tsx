"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChatMessagesPanel } from "@/features/llm-chat/components/chat-app/chat-messages-panel"
import { ChatWorkspaceComposerPanel } from "@/features/llm-chat/components/workspace/chat-workspace-composer-panel"
import { ChatWorkspaceHeader } from "@/features/llm-chat/components/workspace/chat-workspace-header"
import { LangGraphChatStreamProvider } from "@/features/llm-chat/hooks/langgraph-chat-stream-provider"
import { useLangGraphChatStream } from "@/features/llm-chat/hooks/use-langgraph-chat-stream"
import { useChatWorkspaceThread } from "@/features/llm-chat/hooks/workspace/use-chat-workspace-thread"
import { useWorkspaceRuntimeSettings } from "@/features/llm-chat/hooks/workspace/use-workspace-runtime-settings"
import { useChatWorkspaceUi } from "@/features/llm-chat/providers/chat-workspace-ui-provider"
import {
  useListLlmModelsApiV1LlmModelsGetSuspense,
  useListLlmToolsApiV1LlmToolsGetSuspense,
} from "@/shared/api/generated/agent/endpoints/llm/llm"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Skeleton } from "@/shared/components/ui/skeleton"

type ChatWorkspaceThreadViewProps = {
  threadId: string
  starterMessage?: string | null
}

function ChatWorkspaceThreadStarter({
  starterMessage,
}: {
  starterMessage?: string | null
}) {
  const router = useRouter()
  const { sendMessage } = useLangGraphChatStream()
  const hasSubmittedRef = useRef(false)

  useEffect(() => {
    if (!starterMessage || hasSubmittedRef.current) {
      return
    }

    hasSubmittedRef.current = true
    // 새 앱 스레드 진입 직후 첫 메시지는 URL query에서 한 번만 소비한다.
    // useStream threadId 재바인딩 패턴:
    // https://reference.langchain.com/javascript/langchain-react/use-stream
    void sendMessage(starterMessage)
      .then(() => {
        router.replace(window.location.pathname)
      })
      .catch(() => {
        // 첫 전송이 실패하면 같은 starter query로 다시 시도할 수 있게 잠금을 되돌린다.
        hasSubmittedRef.current = false
      })
  }, [router, sendMessage, starterMessage])

  return null
}

function ChatWorkspaceSelectionLock() {
  const { hasPendingInterrupt, isBusy, isHydrating } = useLangGraphChatStream()
  const { setSelectionLocked } = useChatWorkspaceUi()

  useEffect(() => {
    setSelectionLocked(hasPendingInterrupt || isBusy || isHydrating)
    return () => setSelectionLocked(false)
  }, [hasPendingInterrupt, isBusy, isHydrating, setSelectionLocked])

  return null
}

export function ChatWorkspaceThreadView({
  threadId,
  starterMessage,
}: ChatWorkspaceThreadViewProps) {
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
  const { thread, isLoading: isThreadLoading } =
    useChatWorkspaceThread(threadId)
  const runtimeSettings = useWorkspaceRuntimeSettings({
    threadId: thread?.id ?? null,
    tools,
    models,
  })

  if (isThreadLoading || (thread && runtimeSettings.isLoading)) {
    return <Skeleton className="m-4 h-[calc(100%-2rem)] rounded-xl" />
  }

  if (!thread) {
    return (
      <div className="p-4">
        <Alert>
          <AlertDescription>
            선택한 앱 스레드를 찾을 수 없습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (runtimeSettings.error || !runtimeSettings.controls) {
    return (
      <div className="p-4">
        <Alert>
          <AlertDescription>
            스레드 실행 설정을 불러오지 못했습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <LangGraphChatStreamProvider
      key={thread.langgraphThreadId}
      tools={tools}
      models={models}
      modelSelection={runtimeSettings.controls.modelSelection}
      toolPolicy={runtimeSettings.controls.toolPolicy}
      workspaceThread={{
        appThreadId: thread.id,
        langgraphThreadId: thread.langgraphThreadId,
      }}
    >
      <div className="flex h-full min-h-0 flex-col">
        <ChatWorkspaceThreadStarter starterMessage={starterMessage} />
        <ChatWorkspaceSelectionLock />
        <ChatWorkspaceHeader
          appThreadId={thread.id}
          title={thread.title}
          subtitle={thread.subtitle}
        />
        <ChatMessagesPanel />
        <ChatWorkspaceComposerPanel currentThreadId={thread.id} />
      </div>
    </LangGraphChatStreamProvider>
  )
}
