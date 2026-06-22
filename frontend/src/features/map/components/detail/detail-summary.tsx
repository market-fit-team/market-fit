import { X } from "lucide-react"
import type { DistrictData } from "@/features/startup/lib/data"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"

type DetailSummaryProps = {
  onClose: () => void
  tradeArea: DistrictData
}

export function DetailSummary({ onClose, tradeArea }: DetailSummaryProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground">
            {tradeArea.nameKo}
          </h3>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline">{tradeArea.nameEn}</Badge>
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
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {tradeArea.desc}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3 text-xs">
        <div>
          <span className="block text-xs text-muted-foreground">
            월평균 매출
          </span>
          <span className="text-base font-semibold text-foreground">
            {tradeArea.avgSales.toLocaleString()}만원
          </span>
          <span className="block text-xs font-medium text-primary">
            +{tradeArea.yoySalesChange}% YoY
          </span>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">
            3년 생존률
          </span>
          <span className="text-base font-semibold text-foreground">
            {tradeArea.survivalRate3Year}%
          </span>
          <span className="block text-xs text-muted-foreground">
            밀집도: {tradeArea.densityScore}/100
          </span>
        </div>
      </div>
    </div>
  )
}
