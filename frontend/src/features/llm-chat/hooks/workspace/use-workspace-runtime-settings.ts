"use client"

import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { clampReasoningEffort } from "@/features/llm-chat/lib/model-selection/clamp-reasoning-effort"
import { buildToolPolicy } from "@/features/llm-chat/lib/tool-policy/build-tool-policy"
import { buildToolPolicySummary } from "@/features/llm-chat/lib/tool-policy/build-tool-policy-summary"
import type {
  ChatModelOption,
  ChatReasoningEffort,
} from "@/features/llm-chat/types/chat-model-selection"
import type { InterruptOnConfig } from "@/features/llm-chat/types/interrupt-on-config"
import type { LlmToolDefinition } from "@/features/llm-chat/types/llm-tool-definition"
import {
  getGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGetQueryKey,
  useGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGet,
  useUpdateThreadSettingsApiV1AgentThreadsThreadIdSettingsPut,
} from "@/shared/api/generated/agent/endpoints/agent-threads/agent-threads"
import type {
  ThreadSettingsResponse,
  UpdateThreadSettingsRequest,
} from "@/shared/api/generated/agent/schemas"

type UseWorkspaceRuntimeSettingsParams = {
  threadId: string | null
  tools: LlmToolDefinition[]
  models: ChatModelOption[]
}

type OptimisticContext = {
  previous?: ThreadSettingsResponse
  threadId: string
}

const buildDefaultPolicy = (tools: LlmToolDefinition[]) => {
  return buildToolPolicy(
    tools,
    new Set(
      tools.filter((tool) => tool.defaultAllowed).map((tool) => tool.name)
    )
  )
}

export function useWorkspaceRuntimeSettings({
  threadId,
  tools,
  models,
}: UseWorkspaceRuntimeSettingsParams) {
  const queryClient = useQueryClient()
  const effectiveThreadId = threadId ?? ""
  const settingsQuery =
    useGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGet(
      effectiveThreadId,
      {
        query: {
          enabled: Boolean(threadId),
        },
      }
    )
  const updateSettings =
    useUpdateThreadSettingsApiV1AgentThreadsThreadIdSettingsPut<
      Error,
      OptimisticContext
    >({
      mutation: {
        onMutate: async ({ threadId: targetThreadId, data }) => {
          const queryKey =
            getGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGetQueryKey(
              targetThreadId
            )
          await queryClient.cancelQueries({ queryKey })
          const previous =
            queryClient.getQueryData<ThreadSettingsResponse>(queryKey)
          if (previous) {
            queryClient.setQueryData<ThreadSettingsResponse>(queryKey, {
              ...previous,
              ...data,
            })
          }
          return { previous, threadId: targetThreadId }
        },
        onError: (_error, _variables, context) => {
          if (context?.previous) {
            queryClient.setQueryData(
              getGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGetQueryKey(
                context.threadId
              ),
              context.previous
            )
          }
        },
        onSuccess: (data, variables) => {
          queryClient.setQueryData(
            getGetThreadSettingsApiV1AgentThreadsThreadIdSettingsGetQueryKey(
              variables.threadId
            ),
            data
          )
        },
      },
    })

  const settings = settingsQuery.data ?? null

  const controls = useMemo(() => {
    if (!threadId || !settings) {
      return null
    }

    const selectedModel = models.find((model) => model.id === settings.model)
    if (!selectedModel) {
      throw new Error(`알 수 없는 스레드 모델입니다: ${settings.model}`)
    }
    if (
      !selectedModel.supportedReasoningEfforts.includes(
        settings.reasoning_effort as ChatReasoningEffort
      )
    ) {
      throw new Error(
        `모델이 지원하지 않는 추론 단계입니다: ${settings.reasoning_effort}`
      )
    }

    const commit = (data: UpdateThreadSettingsRequest) => {
      updateSettings.mutate({ threadId, data })
    }
    const commitPolicy = (allowedToolNames: Set<string>) => {
      const nextPolicy = buildToolPolicy(tools, allowedToolNames)
      commit({
        model: settings.model,
        reasoning_effort: settings.reasoning_effort as ChatReasoningEffort,
        allowed_tools: nextPolicy.allowedTools,
        interrupt_on: nextPolicy.interruptOn,
      })
    }

    const allowedToolNames = new Set(settings.allowed_tools)

    return {
      modelSelection: {
        model: settings.model,
        reasoningEffort: settings.reasoning_effort as ChatReasoningEffort,
        selectedModel,
        selectModel: (modelId: string) => {
          const nextModel = models.find((model) => model.id === modelId)
          if (!nextModel) {
            return
          }
          commit({
            model: nextModel.id,
            reasoning_effort: clampReasoningEffort(
              settings.reasoning_effort as ChatReasoningEffort,
              nextModel.supportedReasoningEfforts
            ),
            allowed_tools: settings.allowed_tools,
            interrupt_on: settings.interrupt_on,
          })
        },
        selectReasoningEffort: (reasoningEffort: ChatReasoningEffort) => {
          if (
            !selectedModel.supportedReasoningEfforts.includes(reasoningEffort)
          ) {
            return
          }
          commit({
            model: settings.model,
            reasoning_effort: reasoningEffort,
            allowed_tools: settings.allowed_tools,
            interrupt_on: settings.interrupt_on,
          })
        },
      },
      toolPolicy: {
        allowedToolNames,
        allowedTools: settings.allowed_tools,
        interruptOn: settings.interrupt_on as InterruptOnConfig,
        summary: buildToolPolicySummary(
          tools.length,
          settings.allowed_tools.length
        ),
        toggleTool: (toolName: string) => {
          if (!tools.some((tool) => tool.name === toolName)) {
            return
          }
          const nextAllowedToolNames = new Set(allowedToolNames)
          if (nextAllowedToolNames.has(toolName)) {
            nextAllowedToolNames.delete(toolName)
          } else {
            nextAllowedToolNames.add(toolName)
          }
          commitPolicy(nextAllowedToolNames)
        },
        resetToDefault: () => {
          commitPolicy(buildDefaultPolicy(tools).allowedToolNames)
        },
      },
    }
  }, [models, settings, threadId, tools, updateSettings])

  return {
    ...settingsQuery,
    controls,
    isUpdating: updateSettings.isPending,
  }
}
