"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { HttpStatusError } from "@/features/auth/lib/fetch-with-auth"
import { ChatView } from "@/features/chat/components/workspace/chat-view"
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
import { MapChatOverlayPanel } from "@/features/agent/components/map-chat-widget/map-chat-overlay-panel"
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
import {
  useListLlmModelsApiV1LlmModelsGet,
  useListLlmToolsApiV1LlmToolsGet,
} from "@/shared/api/generated/agent/endpoints/llm/llm"
import type { AgentThreadResponse } from "@/shared/api/generated/agent/schemas"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Skeleton } from "@/shared/components/ui/skeleton"

type MapAgentThreadPanelProps = {
  thread: AgentThreadResponse
  starterMessage: string | null
  onStarterSubmitted: () => void
}

function MapAgentThreadStarter({
  starterMessage,
  onSubmitted,
}: {
  starterMessage: string | null
  onSubmitted: () => void
}) {
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
    void submitMessage(trimmedStarterMessage)
      .then((isSubmitted) => {
        if (!isSubmitted) {
          hasSubmittedRef.current = false
          return
        }
        onSubmitted()
      })
      .catch(() => {
        hasSubmittedRef.current = false
      })
  }, [isBusy, isHydrating, onSubmitted, starterMessage, submitMessage])

  return null
}

export function MapAgentThreadPanel({
  thread,
  starterMessage,
  onStarterSubmitted,
}: MapAgentThreadPanelProps) {
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
  const runtimeSettings = useWorkspaceRuntimeSettings({
    threadId: thread.id,
    tools: toolsQuery.data ?? [],
    models: modelsQuery.data ?? [],
  })

  if (
    toolsQuery.isLoading ||
    modelsQuery.isLoading ||
    runtimeSettings.isLoading
  ) {
    return <Skeleton className="m-3 h-[calc(100%-1.5rem)] rounded-xl" />
  }

  if (runtimeSettings.error || !runtimeSettings.controls) {
    return (
      <div className="p-3">
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
      tools={toolsQuery.data ?? []}
      models={modelsQuery.data ?? []}
      modelSelection={runtimeSettings.controls.modelSelection}
      toolPolicy={runtimeSettings.controls.toolPolicy}
      workspaceThread={{
        appThreadId: thread.id,
        langgraphThreadId: thread.langgraph_thread_id,
      }}
    >
      <MapAgentThreadContent
        thread={thread}
        starterMessage={starterMessage}
        onStarterSubmitted={onStarterSubmitted}
      />
    </LangGraphChatStreamProvider>
  )
}

function MapAgentThreadContent({
  thread,
  starterMessage,
  onStarterSubmitted,
}: MapAgentThreadPanelProps) {
  const queryClient = useQueryClient()
  const { resume, toolCalls } = useLangGraphChatStream()
  const replaceSelections = useChatWorkspace((state) => state.replaceSelections)
  const resetSelections = useChatWorkspace((state) => state.resetSelections)
  const selectedArtifactIds = useChatWorkspace(
    (state) => state.selectedArtifactIds
  )
  const selectedDocumentIds = useChatWorkspace(
    (state) => state.selectedDocumentIds
  )
  const [rightPanel, setRightPanel] = useState<ChatRightPanel | null>(null)
  const documentsQuery = useListDocumentsApiV1AgentDocumentsGet()
  const artifactsQuery = useListArtifactsApiV1AgentArtifactsGet({
    thread_id: thread.id,
  })
  const deleteOnboardingContext =
    useDeleteOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextDelete()
  const onboardingContextQuery = useQuery({
    queryKey:
      getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey(
        thread.id
      ),
    retry: false,
    queryFn: async () =>
      readOptionalResource(() =>
        getOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGet(
          thread.id
        )
      ),
  })
  const documents = useMemo(
    () => documentsQuery.data?.documents ?? [],
    [documentsQuery.data?.documents]
  )
  const artifacts = useMemo(
    () => artifactsQuery.data?.artifacts ?? [],
    [artifactsQuery.data?.artifacts]
  )
  const resolvedRightPanel = reconcileWorkspaceRightPanel({
    panel: rightPanel,
    documents,
    artifacts,
  })
  const previousThreadIdRef = useRef<string | null>(null)
  const processedMutationToolCallIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (previousThreadIdRef.current === thread.id) {
      return
    }

    previousThreadIdRef.current = thread.id
    processedMutationToolCallIdsRef.current = new Set()
    resetSelections()
    setRightPanel(null)
  }, [resetSelections, thread.id])

  useEffect(() => {
    if (!documentsQuery.data || !artifactsQuery.data) {
      return
    }

    const nextSelections = pruneWorkspaceSelections({
      documentIds: selectedDocumentIds,
      artifactIds: selectedArtifactIds,
      documents,
      artifacts,
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
    artifactsQuery.data,
    documents,
    documentsQuery.data,
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
          thread_id: thread.id,
        }),
      })
    }

    if (refreshPlan.invalidateDocuments) {
      void queryClient.invalidateQueries({
        queryKey: getListDocumentsApiV1AgentDocumentsGetQueryKey(),
      })
    }
  }, [queryClient, thread.id, toolCalls])

  const handleRemoveOnboardingContext = () => {
    deleteOnboardingContext.mutate(
      { threadId: thread.id },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey:
              getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey(
                thread.id
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

  const handleSetRightPanel = (panel: ChatRightPanel | null) => {
    setRightPanel(panel)

    if (panel?.kind === "artifact") {
      void queryClient.invalidateQueries({
        queryKey: getListArtifactsApiV1AgentArtifactsGetQueryKey({
          thread_id: thread.id,
        }),
      })
      return
    }

    if (panel?.kind === "library" || panel?.kind === "library-document") {
      void queryClient.invalidateQueries({
        queryKey: getListDocumentsApiV1AgentDocumentsGetQueryKey(),
      })
    }
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <MapAgentThreadStarter
        starterMessage={starterMessage}
        onSubmitted={onStarterSubmitted}
      />
      <ChatView
        activeThreadTitle={thread.title}
        artifacts={artifacts}
        documents={documents}
        hasOnboardingContext={onboardingContextQuery.data !== null}
        isOnboardingContextRemoving={deleteOnboardingContext.isPending}
        isRightPanelOpen={Boolean(resolvedRightPanel)}
        isExpanded={!resolvedRightPanel}
        onRemoveOnboardingContext={handleRemoveOnboardingContext}
        onSetRightPanel={handleSetRightPanel}
        onToggleExpand={() =>
          handleSetRightPanel(resolvedRightPanel ? null : { kind: "library" })
        }
        onToggleRightPanel={() => handleSetRightPanel({ kind: "library" })}
        compact
      />
      <MapChatOverlayPanel
        panel={resolvedRightPanel}
        documents={documents}
        isDocumentsLoading={documentsQuery.isLoading}
        onClose={() => handleSetRightPanel(null)}
        onOpenDocument={(document) =>
          handleSetRightPanel({ kind: "library-document", document })
        }
        onHitlDecide={(decisions) => void resume(decisions)}
      />
    </div>
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
