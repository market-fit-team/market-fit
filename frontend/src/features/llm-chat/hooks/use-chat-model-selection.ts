import { useEffect } from "react"
import {
  clampReasoningEffort,
  getDefaultReasoningEffort,
} from "@/features/llm-chat/lib/model-selection/clamp-reasoning-effort"
import { useChatModelSelectionStore } from "@/features/llm-chat/stores/use-chat-model-selection-store"
import type {
  ChatModelOption,
  ChatModelSelection,
  ChatReasoningEffort,
} from "@/features/llm-chat/types/chat-model-selection"

type UseChatModelSelectionResult = ChatModelSelection & {
  selectedModel: ChatModelOption
  selectModel: (modelId: string) => void
  selectReasoningEffort: (reasoningEffort: ChatReasoningEffort) => void
}

export function useChatModelSelection(
  models: ChatModelOption[]
): UseChatModelSelectionResult {
  const selectedModelId = useChatModelSelectionStore((state) => state.selectedModelId)
  const selectedReasoningEffort = useChatModelSelectionStore(
    (state) => state.selectedReasoningEffort
  )
  const setSelectedModel = useChatModelSelectionStore((state) => state.setSelectedModel)
  const setSelectedReasoningEffort = useChatModelSelectionStore(
    (state) => state.setSelectedReasoningEffort
  )

  const fallbackModel = models[0]
  if (!fallbackModel) {
    throw new Error("LLM 모델 목록이 비어 있습니다.")
  }

  const selectedModel =
    models.find((model) => model.id === selectedModelId) ?? fallbackModel
  const effectiveReasoningEffort = selectedReasoningEffort
    ? clampReasoningEffort(
        selectedReasoningEffort,
        selectedModel.supportedReasoningEfforts
      )
    : getDefaultReasoningEffort(selectedModel.supportedReasoningEfforts)

  useEffect(() => {
    if (
      selectedModelId !== selectedModel.id ||
      selectedReasoningEffort !== effectiveReasoningEffort
    ) {
      setSelectedModel(selectedModel.id, effectiveReasoningEffort)
    }
  }, [
    effectiveReasoningEffort,
    selectedModel.id,
    selectedModelId,
    selectedReasoningEffort,
    setSelectedModel,
  ])

  const selectModel = (modelId: string) => {
    const nextModel = models.find((model) => model.id === modelId)
    if (!nextModel) {
      return
    }

    setSelectedModel(
      nextModel.id,
      clampReasoningEffort(effectiveReasoningEffort, nextModel.supportedReasoningEfforts)
    )
  }

  const selectReasoningEffort = (reasoningEffort: ChatReasoningEffort) => {
    if (!selectedModel.supportedReasoningEfforts.includes(reasoningEffort)) {
      return
    }

    setSelectedReasoningEffort(reasoningEffort)
  }

  return {
    model: selectedModel.id,
    reasoningEffort: effectiveReasoningEffort,
    selectedModel,
    selectModel,
    selectReasoningEffort,
  }
}
