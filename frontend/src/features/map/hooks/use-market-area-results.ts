import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAdminAreas } from "@/features/map/hooks/use-admin-areas"
import { getIndustryCode } from "@/features/map/lib/industry-filter-options"
import { marketAreaSearchQueryOptions } from "@/features/map/lib/map-query-options"
import { useMapStore } from "@/features/map/store/map-store"
import type {
  AdminAreaMapData,
  AdminAreaProperties,
  MarketSearchArea,
} from "@/features/map/types/map"

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

const getAdminAreaKey = (sigunguCode: string, dongName: string) =>
  `${sigunguCode}:${dongName}`

const buildAdminAreaIndexes = (adminAreas: AdminAreaMapData | undefined) => {
  const byCode = new Map<string, AdminAreaProperties>()
  const bySigunguAndName = new Map<string, AdminAreaProperties>()

  adminAreas?.dongGeoJson.features.forEach((feature) => {
    byCode.set(feature.properties.code, feature.properties)
    bySigunguAndName.set(
      getAdminAreaKey(feature.properties.sigunguCode, feature.properties.name),
      feature.properties
    )
  })

  return { byCode, bySigunguAndName }
}

const resolveAreaWithAdminArea = (
  area: MarketSearchArea,
  indexes: ReturnType<typeof buildAdminAreaIndexes>
): MarketSearchArea => {
  const adminArea =
    indexes.byCode.get(area.dongCode) ??
    indexes.bySigunguAndName.get(
      getAdminAreaKey(area.sigunguCode, area.dongName)
    )

  if (!adminArea) {
    return area
  }

  return {
    ...area,
    centerLat: adminArea.centerLat,
    centerLng: adminArea.centerLng,
    dongCode: adminArea.code,
    dongName: adminArea.name,
    sigunguCode: adminArea.sigunguCode,
    sigunguName: adminArea.sigunguName,
  }
}

export function useMarketAreaResults() {
  const { data: adminAreas } = useAdminAreas()
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
  const adminAreaIndexes = useMemo(
    () => buildAdminAreaIndexes(adminAreas),
    [adminAreas]
  )
  const areas = useMemo(
    () =>
      hasSearchCondition
        ? (searchQuery.data?.areas ?? EMPTY_AREAS).map((area) =>
            resolveAreaWithAdminArea(area, adminAreaIndexes)
          )
        : EMPTY_AREAS,
    [adminAreaIndexes, hasSearchCondition, searchQuery.data?.areas]
  )

  return {
    areas,
    hasSearchCondition,
    isError: hasSearchCondition ? searchQuery.isError : false,
    isLoading: hasSearchCondition ? searchQuery.isLoading : false,
  }
}
