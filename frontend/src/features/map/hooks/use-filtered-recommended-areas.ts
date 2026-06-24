import { useMemo } from "react"
import { useRecommendedAreas } from "@/features/map/hooks/use-recommended-areas"
import {
  getFilteredTradeAreaIds,
  getSelectedTradeArea,
} from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import type { DistrictData } from "@/features/startup/lib/data"

// 추천 동 목록(useRecommendedAreas)에 상단 필터(업종·자본금·연령)를 2차로 적용한다.
// 추천 목록 위젯과 필터 바 카운트가 같은 결과를 보도록 단일 진입점으로 둔다.
export function useFilteredRecommendedAreas(): DistrictData[] {
  const recommendedDongCodes = useRecommendedAreas()
  const budgetRange = useMapStore((state) => state.budgetRange)
  const selectedCategory = useMapStore((state) => state.selectedCategory)
  const targetDemographic = useMapStore((state) => state.targetDemographic)

  return useMemo(() => {
    const filteredIds = getFilteredTradeAreaIds({
      budgetRange,
      selectedCategory,
      targetDemographic,
    })

    return recommendedDongCodes
      .map((dongCode) => getSelectedTradeArea(dongCode))
      .filter(
        (tradeArea): tradeArea is DistrictData =>
          tradeArea !== null && filteredIds.has(tradeArea.id)
      )
  }, [recommendedDongCodes, budgetRange, selectedCategory, targetDemographic])
}
