"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { HttpStatusError } from "@/features/auth/lib/fetch-with-auth"
import { ChatWorkspaceEmptyState } from "@/features/chat/components/workspace/chat-workspace-empty-state"
import { useLocalWorkspaceRuntimeSettings } from "@/features/chat/hooks/workspace/use-local-workspace-runtime-settings"
import type { ChatReasoningEffort } from "@/features/chat/types/chat-model-selection"
import { useListDocumentsApiV1AgentDocumentsGet } from "@/shared/api/generated/agent/endpoints/agent-documents/agent-documents"
import {
  getGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGetQueryKey,
  getListThreadsApiV1AgentThreadsGetQueryKey,
  updateThreadSettingsApiV1AgentThreadsThreadIdSettingsPut,
  useCreateThreadApiV1AgentThreadsPost,
} from "@/shared/api/generated/agent/endpoints/agent-threads/agent-threads"
import {
  useListLlmModelsApiV1LlmModelsGet,
  useListLlmToolsApiV1LlmToolsGet,
} from "@/shared/api/generated/agent/endpoints/llm/llm"
import type { AgentThreadResponse } from "@/shared/api/generated/agent/schemas"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Skeleton } from "@/shared/components/ui/skeleton"

type MapAgentChatHomeProps = {
  onStartThread: (thread: AgentThreadResponse, starterMessage: string) => void
}

export function MapAgentChatHome({ onStartThread }: MapAgentChatHomeProps) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createThread = useCreateThreadApiV1AgentThreadsPost()
  const documentsQuery = useListDocumentsApiV1AgentDocumentsGet()
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
  const runtimeSettings = useLocalWorkspaceRuntimeSettings({
    tools: toolsQuery.data ?? [],
    models: modelsQuery.data ?? [],
  })
  const runtimeControls = runtimeSettings.controls

  if (
    documentsQuery.isLoading ||
    toolsQuery.isLoading ||
    modelsQuery.isLoading
  ) {
    return <Skeleton className="m-3 h-[calc(100%-1.5rem)] rounded-xl" />
  }

  if (!runtimeControls) {
    return (
      <div className="p-3">
        <Alert>
          <AlertDescription>
            새 채팅 실행 설정을 불러오지 못했습니다.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleSubmit = async (message: string) => {
    try {
      setIsSubmitting(true)
      const thread = await createThread.mutateAsync({
        data: {
          title: "상권 지도 상담",
          subtitle: "지도에서 시작한 AI 상담",
        },
      })

      try {
        const savedSettings =
          await updateThreadSettingsApiV1AgentThreadsThreadIdSettingsPut(
            thread.id,
            {
              model: runtimeControls.modelSelection.model,
              reasoning_effort: runtimeControls.modelSelection.reasoningEffort,
              allowed_tools: runtimeControls.toolPolicy.allowedTools,
              interrupt_on: runtimeControls.toolPolicy.interruptOn,
            }
          )
        queryClient.setQueryData(
          getGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGetQueryKey(
            thread.id
          ),
          savedSettings
        )
      } catch (error) {
        toast.error(resolveThreadSettingsError(error))
      }

      await queryClient.invalidateQueries({
        queryKey: getListThreadsApiV1AgentThreadsGetQueryKey(),
      })
      onStartThread(thread, message)
    } catch (error) {
      toast.error(resolveStartThreadError(error))
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ChatWorkspaceEmptyState
      documents={documentsQuery.data?.documents ?? []}
      draft={draft}
      isPending={isSubmitting || createThread.isPending}
      modelSelection={runtimeControls.modelSelection}
      models={modelsQuery.data ?? []}
      toolPolicy={runtimeControls.toolPolicy}
      onChangeDraft={setDraft}
      onSubmit={handleSubmit}
      compact
    />
  )
}

const resolveStartThreadError = (error: unknown) => {
  if (error instanceof HttpStatusError) {
    const detail =
      typeof error.body === "object" &&
      error.body !== null &&
      "detail" in error.body &&
      typeof error.body.detail === "string"
        ? error.body.detail
        : null

    return detail ?? "새 대화를 시작하지 못했습니다."
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return "새 대화를 시작하지 못했습니다."
}

const resolveThreadSettingsError = (error: unknown) => {
  if (error instanceof HttpStatusError) {
    const detail =
      typeof error.body === "object" &&
      error.body !== null &&
      "detail" in error.body &&
      typeof error.body.detail === "string"
        ? error.body.detail
        : null

    return (
      detail ?? "실행 설정을 저장하지 못했습니다. 기본 설정으로 시작합니다."
    )
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return "실행 설정을 저장하지 못했습니다. 기본 설정으로 시작합니다."
}
