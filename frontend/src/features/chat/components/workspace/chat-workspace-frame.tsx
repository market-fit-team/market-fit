"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter, useSelectedLayoutSegment } from "next/navigation"
import {
  Fingerprint,
  Folder,
  Menu,
  MessageSquare,
  NotebookPen,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { LibraryPanel } from "@/features/chat/components/workspace/library-panel"
import { MemoryPanel } from "@/features/chat/components/workspace/memory-panel"
import {
  OnboardingPanel,
  type OnboardingPanelItem,
} from "@/features/chat/components/workspace/onboarding-panel"
import { ThreadList } from "@/features/chat/components/workspace/thread-list"
import { WorkspaceDetailDialog } from "@/features/chat/components/workspace/workspace-detail-dialog"
import { HttpStatusError } from "@/features/auth/lib/fetch-with-auth"
import { useChatWorkspace } from "@/features/chat/providers/chat-workspace-provider"
import type { ChatOnboardingResultPreview } from "@/features/chat/types/workspace"
import {
  getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey,
  getOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGet,
  useDeleteOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextDelete,
  useSetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextPut,
} from "@/shared/api/generated/agent/endpoints/agent-onboarding-context/agent-onboarding-context"
import { useListDocumentsApiV1AgentDocumentsGet } from "@/shared/api/generated/agent/endpoints/agent-documents/agent-documents"
import { useListMemoriesApiV1AgentMemoriesGet } from "@/shared/api/generated/agent/endpoints/agent-memories/agent-memories"
import {
  getListThreadsApiV1AgentThreadsGetQueryKey,
  useCreateThreadApiV1AgentThreadsPost,
  useDeleteThreadApiV1AgentThreadsThreadIdDelete,
  useListThreadsApiV1AgentThreadsGet,
} from "@/shared/api/generated/agent/endpoints/agent-threads/agent-threads"
import {
  getGetMySurveyProfileSurveysMeProfileGetQueryKey,
  getMySurveyProfileSurveysMeProfileGet,
  useGetSavedSurveyResultsSurveysMeSavedResultsGet,
} from "@/shared/api/generated/onboarding/endpoints/survey/survey"
import type {
  SavedSurveyResultSummary,
  SurveyResultResponse,
} from "@/shared/api/generated/onboarding/schemas"
import { Button } from "@/shared/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/components/ui/resizable"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/lib/utils"

type ChatWorkspaceFrameProps = {
  children: ReactNode
}

export function ChatWorkspaceFrame({
  children,
}: ChatWorkspaceFrameProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentThreadSegment = useSelectedLayoutSegment()
  const currentThreadId = currentThreadSegment ?? null
  const {
    activeLeftTab,
    detailDialog,
    isLeftSidebarOpen,
    selectedDocumentIds,
    setDetailDialog,
    setActiveLeftTab,
    setIsLeftSidebarOpen,
    toggleDocument,
  } = useChatWorkspace()
  const threadsQuery = useListThreadsApiV1AgentThreadsGet()
  const documentsQuery = useListDocumentsApiV1AgentDocumentsGet()
  const memoriesQuery = useListMemoriesApiV1AgentMemoriesGet()
  const createThread = useCreateThreadApiV1AgentThreadsPost()
  const deleteThread = useDeleteThreadApiV1AgentThreadsThreadIdDelete()
  const setOnboardingContext =
    useSetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextPut()
  const deleteOnboardingContext =
    useDeleteOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextDelete()

  const documents = documentsQuery.data?.documents ?? []
  const threads = threadsQuery.data?.threads ?? []
  const memories = memoriesQuery.data?.memories ?? []
  const isOnboardingTabActive =
    activeLeftTab === "onboarding" && isLeftSidebarOpen
  const onboardingContextQuery = useQuery({
    queryKey: currentThreadId
      ? getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey(
          currentThreadId
        )
      : ["agent-onboarding-context", "idle"],
    enabled: currentThreadId !== null,
    retry: false,
    queryFn: async () => {
      if (!currentThreadId) {
        return null
      }

      return readOptionalResource(() =>
        getOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGet(
          currentThreadId
        )
      )
    },
  })
  const defaultProfileQuery = useQuery({
    queryKey: getGetMySurveyProfileSurveysMeProfileGetQueryKey(),
    enabled: isOnboardingTabActive || detailDialog?.kind === "onboarding-result",
    retry: false,
    queryFn: () => readOptionalResource(getMySurveyProfileSurveysMeProfileGet),
  })
  const savedResultsQuery = useGetSavedSurveyResultsSurveysMeSavedResultsGet({
    query: {
      enabled: isOnboardingTabActive,
    },
  })
  const currentOnboardingContext = onboardingContextQuery.data ?? null
  const defaultProfile = defaultProfileQuery.data ?? null
  const onboardingItems = buildOnboardingPanelItems({
    currentResultCode: currentOnboardingContext?.result_code ?? null,
    defaultProfile,
    savedResults: savedResultsQuery.data?.results ?? [],
  })
  const isOnboardingInteractionPending =
    setOnboardingContext.isPending || deleteOnboardingContext.isPending
  const mainPanelDefaultSize = isLeftSidebarOpen ? "76%" : "100%"
  const activityButtonClassName =
    "size-8 cursor-pointer rounded-md text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
  const activeActivityButtonClassName =
    "bg-muted text-foreground ring-1 ring-border/40 hover:bg-muted"

  useEffect(() => {
    setDetailDialog(null)
  }, [currentThreadId, setDetailDialog])

  const invalidateThreads = () => {
    void queryClient.invalidateQueries({
      queryKey: getListThreadsApiV1AgentThreadsGetQueryKey(),
    })
  }

  const handleCreateThread = () => {
    createThread.mutate(
      {
        data: {
          title: "새 대화",
        },
      },
      {
        onSuccess: (thread) => {
          invalidateThreads()
          router.push(`/chat/${thread.id}`)
          toast.success("새 대화가 시작되었습니다.")
        },
      }
    )
  }

  const handleDeleteThread = (threadId: string) => {
    deleteThread.mutate(
      { threadId },
      {
        onSuccess: () => {
          invalidateThreads()
          if (currentThreadId === threadId) {
            router.push("/chat")
          }
          toast("대화가 삭제되었습니다.")
        },
      }
    )
  }

  const openDetailDialog = (
    nextDialog: NonNullable<typeof detailDialog>
  ) => {
    setDetailDialog(nextDialog)
    if (window.innerWidth < 768) {
      setIsLeftSidebarOpen(false)
    }
  }

  const invalidateOnboardingContext = () => {
    if (!currentThreadId) {
      return
    }

    void queryClient.invalidateQueries({
      queryKey:
        getGetOnboardingContextApiV1AgentThreadsThreadIdOnboardingContextGetQueryKey(
          currentThreadId
        ),
    })
  }

  const handleToggleOnboardingContext = (
    result: ChatOnboardingResultPreview
  ) => {
    if (!currentThreadId) {
      toast("대화를 시작한 뒤 사용할 수 있습니다.")
      return
    }

    const isAttached = currentOnboardingContext?.result_code === result.resultCode

    if (isAttached) {
      deleteOnboardingContext.mutate(
        { threadId: currentThreadId },
        {
          onSuccess: () => {
            invalidateOnboardingContext()
            toast("성향분석 컨텍스트를 제거했습니다.")
          },
          onError: (error) => {
            toast.error(
              resolveMutationError(
                error,
                "성향분석 컨텍스트를 제거하지 못했습니다."
              )
            )
          },
        }
      )
      return
    }

    setOnboardingContext.mutate(
      {
        threadId: currentThreadId,
        data: {
          result_code: result.resultCode,
          selected_category_code: result.selectedCategoryCode ?? null,
          source: result.isDefault ? "default_profile" : "manual_attach",
          summary: `${result.profileName} 결과를 현재 대화 컨텍스트에 연결했습니다.`,
        },
      },
      {
        onSuccess: () => {
          invalidateOnboardingContext()
          toast.success("성향분석 컨텍스트에 추가했습니다.")
        },
        onError: (error) => {
          toast.error(
            resolveMutationError(
              error,
              "성향분석 컨텍스트를 추가하지 못했습니다."
            )
          )
        },
      }
    )
  }

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] w-full overflow-hidden bg-background text-foreground">
      <div className="relative z-0 flex w-10 shrink-0 flex-col items-center justify-between border-r border-border/30 bg-background/95 py-3">
        <div className="flex flex-col gap-2">
          <ActivityButton
            className={cn(
              activityButtonClassName,
              activeLeftTab === "threads" && isLeftSidebarOpen
                ? activeActivityButtonClassName
                : "hover:bg-muted/70"
            )}
            label="채팅 목록"
            onClick={() => {
              setActiveLeftTab("threads")
              setIsLeftSidebarOpen(true)
            }}
          >
            <MessageSquare className="size-4" />
          </ActivityButton>
          <ActivityButton
            className={cn(
              activityButtonClassName,
              activeLeftTab === "library" && isLeftSidebarOpen
                ? activeActivityButtonClassName
                : "hover:bg-muted/70"
            )}
            label="라이브러리"
            onClick={() => {
              setActiveLeftTab("library")
              setIsLeftSidebarOpen(true)
            }}
          >
            <Folder className="size-4" />
          </ActivityButton>
          <ActivityButton
            className={cn(
              activityButtonClassName,
              activeLeftTab === "onboarding" && isLeftSidebarOpen
                ? activeActivityButtonClassName
                : "hover:bg-muted/70"
            )}
            label="성향분석"
            onClick={() => {
              setActiveLeftTab("onboarding")
              setIsLeftSidebarOpen(true)
            }}
          >
            <Fingerprint className="size-4" />
          </ActivityButton>
          <ActivityButton
            className={cn(
              activityButtonClassName,
              activeLeftTab === "memory" && isLeftSidebarOpen
                ? activeActivityButtonClassName
                : "hover:bg-muted/70"
            )}
            label="AI 메모리"
            onClick={() => {
              setActiveLeftTab("memory")
              setIsLeftSidebarOpen(true)
            }}
          >
            <NotebookPen className="size-4" />
          </ActivityButton>
        </div>
      </div>

      {isLeftSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsLeftSidebarOpen(false)}
        />
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
          className="absolute top-3 left-3 z-30 cursor-pointer md:hidden"
          id="mobile-menu-btn"
        >
          {isLeftSidebarOpen ? (
            <X className="size-4" />
          ) : (
            <Menu className="size-4" />
          )}
        </Button>

        <ResizablePanelGroup orientation="horizontal" className="h-full w-full">
          {isLeftSidebarOpen && (
            <>
              <ResizablePanel defaultSize="24%" minSize="18%" maxSize="36%">
                {activeLeftTab === "threads" && (
                  <ThreadList
                    threads={threads}
                    isLoading={threadsQuery.isLoading}
                    activeThreadId={currentThreadId}
                    onSelectThread={(threadId) => {
                      router.push(`/chat/${threadId}`)
                      if (window.innerWidth < 768) {
                        setIsLeftSidebarOpen(false)
                      }
                    }}
                    onCreateThread={handleCreateThread}
                    onDeleteThread={handleDeleteThread}
                    onToggleCollapse={() => setIsLeftSidebarOpen(false)}
                  />
                )}
                {activeLeftTab === "library" && (
                  <LibraryPanel
                    documents={documents}
                    isLoading={documentsQuery.isLoading}
                    selectedDocumentIds={selectedDocumentIds}
                    onToggleDocument={toggleDocument}
                    onOpenDocument={(document) =>
                      openDetailDialog({
                        kind: "library-document",
                        document,
                      })
                    }
                    onCollapsePanel={() => setIsLeftSidebarOpen(false)}
                    side="left"
                  />
                )}
                {activeLeftTab === "onboarding" && (
                  <OnboardingPanel
                    items={onboardingItems}
                    isLoading={
                      defaultProfileQuery.isLoading || savedResultsQuery.isLoading
                    }
                    isInteractionPending={isOnboardingInteractionPending}
                    onOpenResult={(result) =>
                      openDetailDialog({
                        kind: "onboarding-result",
                        result,
                      })
                    }
                    onToggleContext={handleToggleOnboardingContext}
                    onCollapsePanel={() => setIsLeftSidebarOpen(false)}
                  />
                )}
                {activeLeftTab === "memory" && (
                  <MemoryPanel
                    memories={memories}
                    isLoading={memoriesQuery.isLoading}
                    onCloseSidebar={() => setIsLeftSidebarOpen(false)}
                  />
                )}
              </ResizablePanel>
              <ResizableHandle
                withHandle
                className="z-10 !w-1.5 cursor-col-resize bg-border/40 transition-colors hover:bg-primary/40"
              />
            </>
          )}

          <ResizablePanel defaultSize={mainPanelDefaultSize} minSize="40%">
            {/* 좌측 공통 프레임을 layout에 고정해 스레드 이동 시에도 유지합니다. */}
            {children}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <WorkspaceDetailDialog
        currentOnboardingContext={currentOnboardingContext}
        currentThreadId={currentThreadId}
        defaultProfile={defaultProfile}
        dialog={detailDialog}
        isOnboardingContextPending={isOnboardingInteractionPending}
        onClose={() => setDetailDialog(null)}
        onToggleOnboardingContext={handleToggleOnboardingContext}
      />
    </div>
  )
}

function ActivityButton({
  children,
  className,
  label,
  onClick,
}: {
  children: ReactNode
  className: string
  label: string
  onClick: () => void
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={className}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

const buildOnboardingPanelItems = ({
  currentResultCode,
  defaultProfile,
  savedResults,
}: {
  currentResultCode: string | null
  defaultProfile: SurveyResultResponse | null
  savedResults: SavedSurveyResultSummary[]
}) => {
  const items: OnboardingPanelItem[] = []

  if (defaultProfile) {
    items.push({
      resultCode: defaultProfile.result_code,
      profileName: defaultProfile.profile_name,
      isDefault: true,
      savedLabel: "기본 프로필",
      savedSource: "default_profile",
      createdAt: defaultProfile.created_at,
      isAttached: currentResultCode === defaultProfile.result_code,
    })
  }

  for (const result of savedResults) {
    if (result.result_code === defaultProfile?.result_code) {
      continue
    }

    items.push({
      resultCode: result.result_code,
      profileName: result.profile_name,
      isDefault: false,
      savedLabel: result.saved_label,
      savedSource: result.saved_source,
      createdAt: result.saved_at,
      isAttached: currentResultCode === result.result_code,
    })
  }

  return items
}

const resolveMutationError = (error: unknown, fallbackMessage: string) => {
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
