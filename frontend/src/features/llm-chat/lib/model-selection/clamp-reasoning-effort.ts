import type { ChatReasoningEffort } from "@/features/llm-chat/types/chat-model-selection"

const REASONING_EFFORT_RANK: Record<ChatReasoningEffort, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
}

export function getDefaultReasoningEffort(
  supportedEfforts: ChatReasoningEffort[]
): ChatReasoningEffort {
  if (supportedEfforts.includes("medium")) {
    return "medium"
  }

  return supportedEfforts[0] ?? "none"
}

export function clampReasoningEffort(
  currentEffort: ChatReasoningEffort,
  supportedEfforts: ChatReasoningEffort[]
): ChatReasoningEffort {
  if (supportedEfforts.includes(currentEffort)) {
    return currentEffort
  }

  const currentRank = REASONING_EFFORT_RANK[currentEffort]
  const lowerOrEqualEfforts = supportedEfforts
    .filter((effort) => REASONING_EFFORT_RANK[effort] <= currentRank)
    .sort((left, right) => REASONING_EFFORT_RANK[right] - REASONING_EFFORT_RANK[left])

  return lowerOrEqualEfforts[0] ?? getDefaultReasoningEffort(supportedEfforts)
}
