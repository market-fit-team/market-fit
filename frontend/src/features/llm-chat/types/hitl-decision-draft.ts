import type { HitlDecisionType } from "@/features/llm-chat/types/hitl-interrupt-payload"

export interface HitlDecisionDraft {
  type: HitlDecisionType
  editedName?: string
  editedArgsText?: string
  message?: string
}

export type HitlDecisionDraftMap = Record<string, HitlDecisionDraft>
