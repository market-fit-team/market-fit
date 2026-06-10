import { useForm } from "react-hook-form"
import {
  type HitlDecisionFormValues,
  buildResumeDecisionsFromForm,
} from "@/features/llm-chat/lib/hitl-decisions/build-resume-decisions-from-form"
import { createDefaultDecisionDrafts } from "@/features/llm-chat/lib/hitl-decisions/create-default-decision-drafts"
import type {
  HitlActionRequest,
  HitlDecision,
} from "@/features/llm-chat/types/hitl-interrupt-payload"

type UseHitlDecisionFormOptions = {
  actionRequests: HitlActionRequest[]
  onDecide: (decisions: HitlDecision[]) => void
}

export function useHitlDecisionForm({
  actionRequests,
  onDecide,
}: UseHitlDecisionFormOptions) {
  const defaultDrafts = createDefaultDecisionDrafts(actionRequests)

  const form = useForm<HitlDecisionFormValues>({
    defaultValues: {
      drafts: defaultDrafts,
    },
  })

  const submit = form.handleSubmit((values) => {
    try {
      form.clearErrors("root")
      const decisions = buildResumeDecisionsFromForm(actionRequests, values)
      onDecide(decisions)
    } catch (error) {
      form.setError("root", {
        message: String(error),
      })
    }
  })

  return {
    form,
    submit,
  }
}
