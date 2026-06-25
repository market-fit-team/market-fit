import { RecommendationEmptyContainer } from "@/features/map/components/recommendation/recommendation-empty-container"
import { RecommendationError } from "@/features/map/components/recommendation/recommendation-error"
import { RecommendationList } from "@/features/map/components/recommendation/recommendation-list"
import { RecommendationSkeleton } from "@/features/map/components/recommendation/recommendation-skeleton"
import { useMarketRecommendations } from "@/features/map/hooks/use-market-recommendations"
import { useMapStore } from "@/features/map/store/map-store"

// 로그인 사용자의 추천 행정동 목록을 표시하고 선택 상태를 지도/미리보기에 반영한다.
export function Recommendation() {
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const selectDong = useMapStore((state) => state.selectDong)
  const focusMapOnDong = useMapStore((state) => state.focusMapOnDong)
  const resetFilters = useMapStore((state) => state.resetFilters)

  const { areas, isError, isLoading } = useMarketRecommendations()

  const handleSelect = (dongCode: string) => {
    selectDong(dongCode)
    focusMapOnDong(dongCode)
  }

  if (isLoading) {
    return <RecommendationSkeleton />
  }

  if (isError) {
    return <RecommendationError />
  }

  if (areas.length === 0) {
    return (
      <RecommendationEmptyContainer
        hasRecommendations={false}
        onResetFilters={resetFilters}
      />
    )
  }

  return (
    <RecommendationList
      areas={areas}
      selectedDongCode={selectedDongCode}
      onSelectArea={handleSelect}
    />
  )
}
