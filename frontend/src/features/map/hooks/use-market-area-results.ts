import { useQuery } from "@tanstack/react-query"
import { getIndustryCode } from "@/features/map/lib/industry-filter-options"
import { marketAreaSearchQueryOptions } from "@/features/map/lib/map-query-options"
import { useMapStore } from "@/features/map/store/map-store"
import type { MarketSearchArea } from "@/features/map/types/map"

// 검색 결과가 없을 때 매 렌더 새 배열을 만들지 않도록 고정 참조를 재사용한다.
const EMPTY_AREAS: MarketSearchArea[] = []

const getHasSearchCondition = ({
  keyword,
  selectedMajorCategory,
  selectedMinorCategory,
}: {
  keyword: string
  selectedMajorCategory: string
  selectedMinorCategory: string
}) =>
  Boolean(
    keyword.trim() ||
    selectedMajorCategory !== "all" ||
    selectedMinorCategory !== "all"
  )

export function useMarketAreaResults() {
  const appliedSearchKeyword = useMapStore(
    (state) => state.appliedSearchKeyword
  )
  const selectedMajorCategory = useMapStore(
    (state) => state.selectedMajorCategory
  )
  const selectedMinorCategory = useMapStore(
    (state) => state.selectedMinorCategory
  )
  const industryCode = getIndustryCode({
    selectedMajorCategory,
    selectedMinorCategory,
  })
  const keyword = appliedSearchKeyword.trim()
  const hasSearchCondition = getHasSearchCondition({
    keyword: appliedSearchKeyword,
    selectedMajorCategory,
    selectedMinorCategory,
  })
  const searchQuery = useQuery({
    ...marketAreaSearchQueryOptions({
      industryCode,
      keyword: keyword || undefined,
    }),
    enabled: hasSearchCondition,
  })

  return {
    areas: hasSearchCondition
      ? (searchQuery.data?.areas ?? EMPTY_AREAS)
      : EMPTY_AREAS,
    hasSearchCondition,
    isError: hasSearchCondition ? searchQuery.isError : false,
    isLoading: hasSearchCondition ? searchQuery.isLoading : false,
  }
}
