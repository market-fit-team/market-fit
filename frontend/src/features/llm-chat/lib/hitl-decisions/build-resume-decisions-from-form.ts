import { buildResumeDecisions } from "@/features/llm-chat/lib/hitl-decisions/build-resume-decisions"
import type { HitlDecisionDraftMap } from "@/features/llm-chat/types/hitl-decision-draft"
import type { HitlActionRequest } from "@/features/llm-chat/types/hitl-interrupt-payload"

export type HitlDecisionFormValues = {
  drafts: HitlDecisionDraftMap
}

export const buildResumeDecisionsFromForm = (
  actionRequests: HitlActionRequest[],
  values: HitlDecisionFormValues
) => buildResumeDecisions(actionRequests, values.drafts)
