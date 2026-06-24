import type { DistrictData } from "@/features/startup/lib/data"
import { Badge } from "@/shared/components/ui/badge"

type RecommendationItemProps = {
  isSelected: boolean
  onSelect: () => void
  tradeArea: DistrictData
}

export function RecommendationItem({
  isSelected,
  onSelect,
  tradeArea,
}: RecommendationItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{tradeArea.nameKo}</span>
        <Badge variant="outline">{tradeArea.nameEn}</Badge>
      </div>
      <span className="text-xs text-muted-foreground">
        월평균 매출 {tradeArea.avgSales.toLocaleString()}만원 · 3년 생존률{" "}
        {tradeArea.survivalRate3Year}%
      </span>
    </button>
  )
}
