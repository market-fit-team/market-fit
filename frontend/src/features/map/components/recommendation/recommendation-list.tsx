import { RecommendationItem } from "@/features/map/components/recommendation/recommendation-item"
import type { MarketAreaListItem } from "@/features/map/types/map"
import { CardContent } from "@/shared/components/ui/card"

type RecommendationListProps = {
  areas: MarketAreaListItem[]
  onSelectArea: (dongCode: string) => void
  selectedDongCode: string | null
}

export function RecommendationList({
  areas,
  onSelectArea,
  selectedDongCode,
}: RecommendationListProps) {
  return (
    <CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 text-xs">
      {areas.map((tradeArea) => (
        <RecommendationItem
          key={tradeArea.dongCode}
          tradeArea={tradeArea}
          isSelected={tradeArea.dongCode === selectedDongCode}
          onSelect={() => onSelectArea(tradeArea.dongCode)}
        />
      ))}
    </CardContent>
  )
}
