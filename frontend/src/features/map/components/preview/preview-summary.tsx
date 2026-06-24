import { X } from "lucide-react"
import type { DistrictData } from "@/features/startup/lib/data"
import { Button } from "@/shared/components/ui/button"

type PreviewSummaryProps = {
  onClose: () => void
  tradeArea: DistrictData
}

export function PreviewSummary({ onClose, tradeArea }: PreviewSummaryProps) {
  return (
    <div className="border-b border-border pb-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-foreground">
          {tradeArea.nameKo}
        </h3>
        <div className="flex items-center gap-1.5">
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
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {tradeArea.desc}
      </p>
    </div>
  )
}
