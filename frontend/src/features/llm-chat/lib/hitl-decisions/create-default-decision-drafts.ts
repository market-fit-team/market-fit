import type { HitlDecisionDraftMap } from "@/features/llm-chat/types/hitl-decision-draft"
import type { HitlActionRequest } from "@/features/llm-chat/types/hitl-interrupt-payload"

export const createDefaultDecisionDrafts = (
  actionRequests: HitlActionRequest[]
): HitlDecisionDraftMap => {
  return Object.fromEntries(
    actionRequests.map((request, index) => [
      String(index),
      {
        type: "approve",
        editedName: request.name,
        editedArgsText: JSON.stringify(request.args, null, 2),
      },
    ])
  )
}
