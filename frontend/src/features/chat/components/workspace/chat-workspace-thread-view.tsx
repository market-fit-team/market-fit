"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { ChatView } from "@/features/chat/components/workspace/chat-view"
import { ChatWorkspaceShell } from "@/features/chat/components/workspace/chat-workspace-shell"
import { LangGraphChatStreamProvider } from "@/features/chat/hooks/langgraph-chat-stream-provider"
import { useLangGraphChatStream } from "@/features/chat/hooks/use-langgraph-chat-stream"
import { useWorkspaceRuntimeSettings } from "@/features/chat/hooks/workspace/use-workspace-runtime-settings"
import {
  areWorkspaceSelectionsEqual,
  getWorkspaceRefreshPlan,
  pruneWorkspaceSelections,
  reconcileWorkspaceRightPanel,
} from "@/features/chat/lib/workspace/reconcile-workspace-state"
import { useChatWorkspace } from "@/features/chat/providers/chat-workspace-provider"
import type { ChatReasoningEffort } from "@/features/chat/types/chat-model-selection"
import {
  getListArtifactsApiV1AgentArtifactsGetQueryKey,
  useListArtifactsApiV1AgentArtifactsGet,
} from "@/shared/api/generated/agent/endpoints/agent-artifacts/agent-artifacts"
import {
  getListDocumentsApiV1AgentDocumentsGetQueryKey,
  useListDocumentsApiV1AgentDocumentsGet,
} from "@/shared/api/generated/agent/endpoints/agent-documents/agent-documents"
import { useListThreadsApiV1AgentThreadsGet } from "@/shared/api/generated/agent/endpoints/agent-threads/agent-threads"
import {
  useListLlmModelsApiV1LlmModelsGet,
  useListLlmToolsApiV1LlmToolsGet,
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
    void sendMessage(starterMessage)
      .then(() => {
        router.replace(window.location.pathname)
      })
      .catch(() => {
        hasSubmittedRef.current = false
      })
  }, [router, sendMessage, starterMessage])

  return null
}

export function ChatWorkspaceThreadView({
  threadId,
  starterMessage,
}: ChatWorkspaceThreadViewProps) {
  const toolsQuery = useListLlmToolsApiV1LlmToolsGet({
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
  const modelsQuery = useListLlmModelsApiV1LlmModelsGet({
    query: {
      select: (data) =>
        data.list.map((model) => ({
          id: model.id,
          object: model.object,
          created: model.created,
          supportedReasoningEfforts:
            model.supported_reasoning_efforts as ChatReasoningEffort[],
        })),
    },
  })
  const threadsQuery = useListThreadsApiV1AgentThreadsGet()
  const thread =
    threadsQuery.data?.threads.find((candidate) => candidate.id === threadId) ??
    null
  const tools = toolsQuery.data ?? []
  const models = modelsQuery.data ?? []
  const runtimeSettings = useWorkspaceRuntimeSettings({
    threadId: thread?.id ?? null,
    tools,
    models,
  })

  if (
    threadsQuery.isLoading ||
    toolsQuery.isLoading ||
    modelsQuery.isLoading ||
    (thread && runtimeSettings.isLoading)
  ) {
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
      key={thread.langgraph_thread_id}
      tools={tools}
      models={models}
      modelSelection={runtimeSettings.controls.modelSelection}
      toolPolicy={runtimeSettings.controls.toolPolicy}
      workspaceThread={{
        appThreadId: thread.id,
        langgraphThreadId: thread.langgraph_thread_id,
      }}
    >
      <ChatThreadWorkspace
        activeThreadTitle={thread.title}
        appThreadId={thread.id}
        starterMessage={starterMessage}
      />
    </LangGraphChatStreamProvider>
  )
}

function ChatThreadWorkspace({
  activeThreadTitle,
  appThreadId,
  starterMessage,
}: {
  activeThreadTitle: string
  appThreadId: string
  starterMessage?: string | null
}) {
  const queryClient = useQueryClient()
  const { resume, toolCalls } = useLangGraphChatStream()
  const {
    isLeftSidebarOpen,
    replaceSelections,
    resetSelections,
    rightPanel,
    selectedArtifactIds,
    selectedDocumentIds,
    setIsLeftSidebarOpen,
    setRightPanel,
  } = useChatWorkspace()
  const documentsQuery = useListDocumentsApiV1AgentDocumentsGet()
  const artifactsQuery = useListArtifactsApiV1AgentArtifactsGet({
    thread_id: appThreadId,
  })
  const documents = documentsQuery.data?.documents
  const artifacts = artifactsQuery.data?.artifacts
  const isExpanded = !isLeftSidebarOpen && !rightPanel
  const previousThreadIdRef = useRef<string | null>(null)
  const processedMutationToolCallIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (previousThreadIdRef.current === appThreadId) {
      return
    }

    previousThreadIdRef.current = appThreadId
    processedMutationToolCallIdsRef.current = new Set()
    resetSelections()

    if (rightPanel != null && rightPanel.kind !== "library") {
      setRightPanel(null)
    }
  }, [appThreadId, resetSelections, rightPanel, setRightPanel])

  useEffect(() => {
    const nextSelections = pruneWorkspaceSelections({
      documentIds: selectedDocumentIds,
      artifactIds: selectedArtifactIds,
      documents: documents ?? [],
      artifacts: artifacts ?? [],
    })

    if (
      !areWorkspaceSelectionsEqual(nextSelections, {
        documentIds: selectedDocumentIds,
        artifactIds: selectedArtifactIds,
      })
    ) {
      replaceSelections(nextSelections)
    }
  }, [
    artifacts,
    documents,
    replaceSelections,
    selectedArtifactIds,
    selectedDocumentIds,
  ])

  useEffect(() => {
    const nextPanel = reconcileWorkspaceRightPanel({
      panel: rightPanel,
      documents: documents ?? [],
      artifacts: artifacts ?? [],
    })

    if (nextPanel !== rightPanel) {
      setRightPanel(nextPanel)
    }
  }, [artifacts, documents, rightPanel, setRightPanel])

  useEffect(() => {
    const refreshPlan = getWorkspaceRefreshPlan({
      toolCalls,
      processedCallIds: processedMutationToolCallIdsRef.current,
    })

    if (refreshPlan.processedCallIds.length === 0) {
      return
    }

    for (const callId of refreshPlan.processedCallIds) {
      processedMutationToolCallIdsRef.current.add(callId)
    }

    if (refreshPlan.invalidateArtifacts) {
      void queryClient.invalidateQueries({
        queryKey: getListArtifactsApiV1AgentArtifactsGetQueryKey({
          thread_id: appThreadId,
        }),
      })
    }

    if (refreshPlan.invalidateDocuments) {
      void queryClient.invalidateQueries({
        queryKey: getListDocumentsApiV1AgentDocumentsGetQueryKey(),
      })
    }
  }, [appThreadId, queryClient, toolCalls])

  const handleToggleExpand = () => {
    if (isExpanded) {
      setIsLeftSidebarOpen(true)
      setRightPanel({ kind: "library" })
    } else {
      setIsLeftSidebarOpen(false)
      setRightPanel(null)
    }
  }

  return (
    <ChatWorkspaceShell
      currentThreadId={appThreadId}
      onHitlDecide={(decisions) => void resume(decisions)}
    >
      <ChatWorkspaceThreadStarter starterMessage={starterMessage} />
      <ChatView
        activeThreadTitle={activeThreadTitle}
        appThreadId={appThreadId}
        artifacts={artifacts ?? []}
        documents={documents ?? []}
        isRightPanelOpen={Boolean(rightPanel)}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        onToggleRightPanel={() => setRightPanel({ kind: "library" })}
      />
    </ChatWorkspaceShell>
  )
}
