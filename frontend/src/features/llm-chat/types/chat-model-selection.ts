export type ChatReasoningEffort = "none" | "low" | "medium" | "high"

export type ChatModelOption = {
  id: string
  object: string
  created: number
  supportedReasoningEfforts: ChatReasoningEffort[]
}

export type ChatModelSelection = {
  model: string
  reasoningEffort: ChatReasoningEffort
}
