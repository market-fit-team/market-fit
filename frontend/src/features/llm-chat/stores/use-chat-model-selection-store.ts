import { create } from "zustand"
import type { ChatReasoningEffort } from "@/features/llm-chat/types/chat-model-selection"

type ChatModelSelectionStore = {
  selectedModelId: string | null
  selectedReasoningEffort: ChatReasoningEffort | null
  setSelectedModel: (
    modelId: string,
    reasoningEffort: ChatReasoningEffort
  ) => void
  setSelectedReasoningEffort: (reasoningEffort: ChatReasoningEffort) => void
  resetModelSelection: () => void
}

export const useChatModelSelectionStore = create<ChatModelSelectionStore>(
  (set) => ({
    selectedModelId: null,
    selectedReasoningEffort: null,
    setSelectedModel: (modelId, reasoningEffort) => {
      set({
        selectedModelId: modelId,
        selectedReasoningEffort: reasoningEffort,
      })
    },
    setSelectedReasoningEffort: (reasoningEffort) => {
      set({ selectedReasoningEffort: reasoningEffort })
    },
    resetModelSelection: () => {
      set({
        selectedModelId: null,
        selectedReasoningEffort: null,
      })
    },
  })
)
