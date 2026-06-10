import { ShieldAlert } from "lucide-react"
import { FormProvider, useFormContext } from "react-hook-form"
import { HitlDecisionToolbar } from "@/features/llm-chat/components/hitl/hitl-decision-toolbar"
import { HitlEditedActionEditor } from "@/features/llm-chat/components/hitl/hitl-edited-action-editor"
import { useHitlDecisionForm } from "@/features/llm-chat/hooks/use-hitl-decision-form"
import type { HitlDecisionFormValues } from "@/features/llm-chat/lib/hitl-decisions/build-resume-decisions-from-form"
import type {
  HitlDecisionDraft,
  HitlDecisionDraftMap,
} from "@/features/llm-chat/types/hitl-decision-draft"
import type {
  HitlActionRequest,
  HitlDecision,
  HitlDecisionType,
  HitlInterrupt,
} from "@/features/llm-chat/types/hitl-interrupt-payload"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Textarea } from "@/shared/components/ui/textarea"

interface HitlInterruptCardProps {
  interrupts: HitlInterrupt[]
  disabled?: boolean
  onDecide: (decisions: HitlDecision[]) => void
}

const flattenActionRequests = (interrupts: HitlInterrupt[]) =>
  interrupts.flatMap((interrupt) => interrupt.value?.action_requests ?? [])

const APPROVE_DRAFT: HitlDecisionDraft = { type: "approve" }

const flattenAllowedDecisions = (
  interrupts: HitlInterrupt[],
  actionName: string
) => {
  return (
    interrupts
      .flatMap((interrupt) => interrupt.value?.review_configs ?? [])
      .find((config) => config.action_name === actionName)
      ?.allowed_decisions ?? ["approve", "reject"]
  )
}

export function HitlInterruptCard({
  interrupts,
  disabled,
  onDecide,
}: HitlInterruptCardProps) {
  const actionRequests = flattenActionRequests(interrupts)

  return (
    <HitlInterruptForm
      key={actionRequests
        .map((request, index) => `${index}:${request.name}`)
        .join("|")}
      interrupts={interrupts}
      actionRequests={actionRequests}
      disabled={disabled}
      onDecide={onDecide}
    />
  )
}

interface HitlInterruptFormProps extends HitlInterruptCardProps {
  actionRequests: HitlActionRequest[]
}

function HitlInterruptForm({
  interrupts,
  actionRequests,
  disabled,
  onDecide,
}: HitlInterruptFormProps) {
  const { form, submit } = useHitlDecisionForm({ actionRequests, onDecide })
  const drafts = form.watch("drafts")
  const error = form.formState.errors.root?.message

  return (
    <Card className="border-amber-300/60 bg-amber-50/60">
      <CardHeader className="border-b border-amber-200/80">
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-amber-700" />
          도구 실행 승인이 필요합니다
        </CardTitle>
      </CardHeader>

      <FormProvider {...form}>
        <CardContent className="space-y-4 py-4">
          {actionRequests.map((request, index) => {
            const draft = drafts[String(index)] ?? APPROVE_DRAFT
            const allowedDecisions = flattenAllowedDecisions(
              interrupts,
              request.name
            )

            return (
              <HitlActionRequestCard
                key={`${index}:${request.name}`}
                index={index}
                request={request}
                draft={draft}
                allowedDecisions={allowedDecisions}
                onUpdateDraft={(patch) => {
                  form.setValue(`drafts.${index}`, {
                    ...draft,
                    ...patch,
                  })
                }}
              />
            )
          })}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={() => void submit()} disabled={disabled}>
              결정 전달
            </Button>
          </div>
        </CardContent>
      </FormProvider>
    </Card>
  )
}

interface HitlActionRequestCardProps {
  index: number
  request: HitlActionRequest
  draft: HitlDecisionDraftMap[string]
  allowedDecisions: HitlDecisionType[]
  onUpdateDraft: (patch: Partial<HitlDecisionDraftMap[string]>) => void
}

function HitlActionRequestCard({
  index,
  request,
  draft,
  allowedDecisions,
  onUpdateDraft,
}: HitlActionRequestCardProps) {
  const form = useFormContext<HitlDecisionFormValues>()
  const fieldPath = `drafts.${index}` as const

  return (
    <div className="rounded-xl border border-border/80 bg-background p-4">
      <div className="space-y-1">
        <div className="font-mono text-base font-semibold">{request.name}</div>
        <p className="text-sm leading-5 text-muted-foreground">
          {request.description}
        </p>
      </div>

      <div className="mt-3">
        <HitlDecisionToolbar
          activeDecision={draft.type}
          allowedDecisions={allowedDecisions}
          onSelect={(decision) => onUpdateDraft({ type: decision })}
        />
      </div>

      <ScrollArea className="mt-3 h-40 rounded-lg border border-border/70 bg-muted/40 p-3">
        <pre className="text-sm leading-5 whitespace-pre-wrap">
          {JSON.stringify(request.args, null, 2)}
        </pre>
      </ScrollArea>

      {draft.type === "edit" && (
        <div className="mt-3">
          <HitlEditedActionEditor
            nameRegistration={form.register(`${fieldPath}.editedName`)}
            argsTextRegistration={form.register(`${fieldPath}.editedArgsText`)}
          />
        </div>
      )}

      {(draft.type === "reject" || draft.type === "respond") && (
        <div className="mt-3">
          <Textarea
            {...form.register(`${fieldPath}.message`)}
            placeholder={
              draft.type === "reject" ? "거절 사유" : "AI에게 전달할 응답"
            }
          />
        </div>
      )}
    </div>
  )
}
