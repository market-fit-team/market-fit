"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { HttpStatusError } from "@/features/auth/lib/fetch-with-auth"
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
import type { ChatRightPanel } from "@/features/chat/types/workspace"
import {
  getListArtifactsApiV1AgentArtifactsGetQueryKey,
  useListArtifactsApiV1AgentArtifactsGet,
} from "@/shared/api/generated/agent/endpoints/agent-artifacts/agent-artifacts"
import {
  getListDocumentsApiV1AgentDocumentsGetQueryKey,
  useListDocumentsApiV1AgentDocumentsGet,
} from "@/shared/api/generated/agent/endpoints/agent-documents/agent-documents"
import {
  getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey,
  getOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGet,
  useDeleteOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextDelete,
} from "@/shared/api/generated/agent/endpoints/agent-onboarding-context/agent-onboarding-context"
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
  starterSelections?: {
    selectedArtifactIds?: string[]
    selectedDocumentIds?: string[]
  }
}

function ChatWorkspaceThreadStarter({
  starterMessage,
  starterSelections,
  threadId,
}: {
  starterMessage?: string | null
  starterSelections?: {
    selectedArtifactIds?: string[]
    selectedDocumentIds?: string[]
  }
  threadId: string
}) {
  const router = useRouter()
  const { isBusy, isHydrating, submitMessage } = useLangGraphChatStream()
  const hasSubmittedRef = useRef(false)

  useEffect(() => {
    const trimmedStarterMessage = starterMessage?.trim()

    if (
      !trimmedStarterMessage ||
      hasSubmittedRef.current ||
      isBusy ||
      isHydrating
    ) {
      return
    }

    hasSubmittedRef.current = true
    void submitMessage(trimmedStarterMessage, starterSelections)
      .then((isSubmitted) => {
        if (!isSubmitted) {
          hasSubmittedRef.current = false
          return
        }
        router.replace(`/chat/${threadId}`)
      })
      .catch(() => {
        hasSubmittedRef.current = false
      })
  }, [isBusy, isHydrating, router, starterMessage, starterSelections, submitMessage, threadId])

  return null
}

export function ChatWorkspaceThreadView({
  threadId,
  starterMessage,
  starterSelections,
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
        starterSelections={starterSelections}
      />
    </LangGraphChatStreamProvider>
  )
}

function ChatThreadWorkspace({
  activeThreadTitle,
  appThreadId,
  starterMessage,
  starterSelections,
}: {
  activeThreadTitle: string
  appThreadId: string
  starterMessage?: string | null
  starterSelections?: {
    selectedArtifactIds?: string[]
    selectedDocumentIds?: string[]
  }
}) {
  const queryClient = useQueryClient()
  const { resume, toolCalls } = useLangGraphChatStream()
  const isLeftSidebarOpen = useChatWorkspace((state) => state.isLeftSidebarOpen)
  const replaceSelections = useChatWorkspace((state) => state.replaceSelections)
  const resetSelections = useChatWorkspace((state) => state.resetSelections)
  const selectedArtifactIds = useChatWorkspace(
    (state) => state.selectedArtifactIds
  )
  const selectedDocumentIds = useChatWorkspace(
    (state) => state.selectedDocumentIds
  )
  const setIsLeftSidebarOpen = useChatWorkspace(
    (state) => state.setIsLeftSidebarOpen
  )
  const [rightPanel, setRightPanel] = useState<ChatRightPanel | null>(null)
  const documentsQuery = useListDocumentsApiV1AgentDocumentsGet()
  const artifactsQuery = useListArtifactsApiV1AgentArtifactsGet({
    thread_id: appThreadId,
  })
  const deleteOnboardingContext =
    useDeleteOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextDelete()
  const onboardingContextQuery = useQuery({
    queryKey:
      getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey(
        appThreadId
      ),
    retry: false,
    queryFn: async () =>
      readOptionalResource(() =>
        getOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGet(
          appThreadId
        )
      ),
  })
  const documents = documentsQuery.data?.documents
  const artifacts = artifactsQuery.data?.artifacts
  const hasOnboardingContext = onboardingContextQuery.data !== null
  const resolvedRightPanel = reconcileWorkspaceRightPanel({
    panel: rightPanel,
    documents: documents ?? [],
    artifacts: artifacts ?? [],
  })
  const isExpanded = !isLeftSidebarOpen && !resolvedRightPanel
  const previousThreadIdRef = useRef<string | null>(null)
  const processedMutationToolCallIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (previousThreadIdRef.current === appThreadId) {
      return
    }

    previousThreadIdRef.current = appThreadId
    processedMutationToolCallIdsRef.current = new Set()
    resetSelections()
    setRightPanel(null)
  }, [appThreadId, resetSelections])

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

  const handleRemoveOnboardingContext = () => {
    deleteOnboardingContext.mutate(
      { threadId: appThreadId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey(
                appThreadId
              ),
          })
          toast("성향분석을 채팅에서 제거했습니다.")
        },
        onError: (error) => {
          toast.error(
            resolveWorkspaceMutationError(
              error,
              "성향분석을 채팅에서 제거하지 못했습니다."
            )
          )
        },
      }
    )
  }

  return (
    <ChatWorkspaceShell
      panel={resolvedRightPanel}
      onSetPanel={setRightPanel}
      onHitlDecide={(decisions) => void resume(decisions)}
    >
      <ChatWorkspaceThreadStarter
        starterMessage={starterMessage}
        starterSelections={starterSelections}
        threadId={appThreadId}
      />
      <ChatView
        activeThreadTitle={activeThreadTitle}
        artifacts={artifacts ?? []}
        documents={documents ?? []}
        hasOnboardingContext={hasOnboardingContext}
        isOnboardingContextRemoving={deleteOnboardingContext.isPending}
        isRightPanelOpen={Boolean(resolvedRightPanel)}
        isExpanded={isExpanded}
        onRemoveOnboardingContext={handleRemoveOnboardingContext}
        onSetRightPanel={setRightPanel}
        onToggleExpand={handleToggleExpand}
        onToggleRightPanel={() => setRightPanel({ kind: "library" })}
      />
    </ChatWorkspaceShell>
  )
}

const readOptionalResource = async <T,>(loader: () => Promise<T>) => {
  try {
    return await loader()
  } catch (error) {
    if (error instanceof HttpStatusError && error.status === 404) {
      return null
    }
    throw error
  }
}

const resolveWorkspaceMutationError = (
  error: unknown,
  fallbackMessage: string
) => {
  if (error instanceof HttpStatusError) {
    const detail =
      typeof error.body === "object" &&
      error.body !== null &&
      "detail" in error.body &&
      typeof error.body.detail === "string"
        ? error.body.detail
        : null

    return detail ?? fallbackMessage
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallbackMessage
}
