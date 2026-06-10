import { parseEditedActionArgs } from "@/features/llm-chat/lib/hitl-decisions/parse-edited-action-args"
import type {
  HitlDecisionDraft,
  HitlDecisionDraftMap,
} from "@/features/llm-chat/types/hitl-decision-draft"
import type {
  HitlActionRequest,
  HitlDecision,
} from "@/features/llm-chat/types/hitl-interrupt-payload"

const APPROVE_DRAFT: HitlDecisionDraft = { type: "approve" }

const assertNever = (type: never): never => {
  throw new Error(`Unhandled HITL decision type: ${type}`)
}

export const buildResumeDecisions = (
  actionRequests: HitlActionRequest[],
  drafts: HitlDecisionDraftMap
): HitlDecision[] => {
  return actionRequests.map((request, index) => {
    const draft = drafts[String(index)] ?? APPROVE_DRAFT

    switch (draft.type) {
      case "edit":
        return {
          type: "edit",
          editedAction: {
            name: draft.editedName || request.name,
            args: parseEditedActionArgs(draft.editedArgsText ?? "{}"),
          },
        }
      case "reject":
        return {
          type: "reject",
          ...(draft.message?.trim() ? { message: draft.message.trim() } : {}),
        }
      case "respond":
        return {
          type: "respond",
          message:
            draft.message?.trim() || "사용자가 직접 응답을 제공했습니다.",
        }
      case "approve":
        return {
          type: "approve",
        }
      default:
        return assertNever(draft.type)
    }
  })
}
