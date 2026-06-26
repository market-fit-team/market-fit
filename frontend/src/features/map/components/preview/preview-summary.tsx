import { X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"

type PreviewSummaryProps = {
  dongName: string
  onClose: () => void
  sigunguName: string
}

export function PreviewSummary({
  dongName,
  onClose,
  sigunguName,
}: PreviewSummaryProps) {
  return (
    <div className="border-b border-border pb-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-foreground">{dongName}</h3>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="상세 패널 닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {sigunguName}
      </p>
    </div>
  )
}
