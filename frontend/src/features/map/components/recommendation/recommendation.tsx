"use client"

import { RecommendationEmpty } from "@/features/map/components/recommendation/recommendation-empty"
import { RecommendationItem } from "@/features/map/components/recommendation/recommendation-item"
import { useFilteredRecommendedAreas } from "@/features/map/hooks/use-filtered-recommended-areas"
import { useRecommendedAreas } from "@/features/map/hooks/use-recommended-areas"
import { useMapStore } from "@/features/map/store/map-store"
import { CardContent } from "@/shared/components/ui/card"

// 추천 원천(온보딩·설문·AI)은 useFilteredRecommendedAreas 훅이 필터까지 적용해 파생하므로
// 여기서는 표시만 맡는다.
export function Recommendation() {
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const selectDong = useMapStore((state) => state.selectDong)
  const focusMapOnDong = useMapStore((state) => state.focusMapOnDong)
  const resetFilters = useMapStore((state) => state.resetFilters)

  // 추천 자체 유무(필터 전)와 필터 적용 결과를 구분해 빈 상태 안내를 다르게 보여준다.
  const hasAnyRecommendation = useRecommendedAreas().length > 0
  const recommendedTradeAreas = useFilteredRecommendedAreas()

  const handleSelect = (dongCode: string) => {
    selectDong(dongCode)
    focusMapOnDong(dongCode)
  }

  if (recommendedTradeAreas.length === 0) {
    return (
      <RecommendationEmpty
        hasRecommendations={hasAnyRecommendation}
        onResetFilters={resetFilters}
      />
    )
  }

  return (
    <CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3 text-xs">
      {recommendedTradeAreas.map((tradeArea) => {
        return (
          <RecommendationItem
            key={tradeArea.id}
            tradeArea={tradeArea}
            isSelected={tradeArea.id === selectedDongCode}
            onSelect={() => handleSelect(tradeArea.id)}
          />
        )
      })}
    </CardContent>
  )
}
