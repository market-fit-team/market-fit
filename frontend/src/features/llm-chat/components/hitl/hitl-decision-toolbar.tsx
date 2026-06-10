import { Check, Edit3, MessageSquare, X } from "lucide-react"
import type { HitlDecisionType } from "@/features/llm-chat/types/hitl-interrupt-payload"
import { Button } from "@/shared/components/ui/button"

interface HitlDecisionToolbarProps {
  activeDecision: HitlDecisionType
  allowedDecisions: HitlDecisionType[]
  onSelect: (decision: HitlDecisionType) => void
}

export function HitlDecisionToolbar({
  activeDecision,
  allowedDecisions,
  onSelect,
}: HitlDecisionToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {allowedDecisions.includes("approve") && (
        <Button
          variant={activeDecision === "approve" ? "default" : "outline"}
          size="xs"
          onClick={() => onSelect("approve")}
        >
          <Check className="size-3" />
          approve
        </Button>
      )}

      {allowedDecisions.includes("edit") && (
        <Button
          variant={activeDecision === "edit" ? "default" : "outline"}
          size="xs"
          onClick={() => onSelect("edit")}
        >
          <Edit3 className="size-3" />
          edit
        </Button>
      )}

      {allowedDecisions.includes("reject") && (
        <Button
          variant={activeDecision === "reject" ? "default" : "outline"}
          size="xs"
          onClick={() => onSelect("reject")}
        >
          <X className="size-3" />
          reject
        </Button>
      )}

      {allowedDecisions.includes("respond") && (
        <Button
          variant={activeDecision === "respond" ? "default" : "outline"}
          size="xs"
          onClick={() => onSelect("respond")}
        >
          <MessageSquare className="size-3" />
          respond
        </Button>
      )}
    </div>
  )
}
