import { useMemo, useRef } from "react"
import { useTheme } from "next-themes"
import { useAdminAreas } from "@/features/map/hooks/use-admin-areas"
import { useDongPolygonMap } from "@/features/map/hooks/use-dong-polygon-map"
import { useMarketAreaResults } from "@/features/map/hooks/use-market-area-results"
import { useMarketRecommendations } from "@/features/map/hooks/use-market-recommendations"
import { getMapViewportPadding } from "@/features/map/lib/map-renderer/map-config"
import { useMapStore } from "@/features/map/store/map-store"
import { Skeleton } from "@/shared/components/ui/skeleton"

// Canvas는 지도 표면을 렌더링하고 polygon 상호작용 상태만 스토어에 기록
// 필터링/추천/선택 표시는 스토어 상태에서 파생, 지도 layer는 표시 역할
export function Canvas() {
  const { resolvedTheme } = useTheme()
  const {
    data: adminAreas = null,
    isError: isAdminAreasError,
    isLoading: isAdminAreasLoading,
  } = useAdminAreas()
  const { areas: searchAreas, hasSearchCondition } = useMarketAreaResults()
  const { areas: recommendedAreas } = useMarketRecommendations()
  const isLeftPanelOpen = useMapStore((state) => state.isLeftPanelOpen)
  const mapFocusRequest = useMapStore((state) => state.mapFocusRequest)
  const hoveredDongCode = useMapStore((state) => state.hoveredDongCode)
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const clearPolygonHover = useMapStore((state) => state.clearPolygonHover)
  const focusMapOnDong = useMapStore((state) => state.focusMapOnDong)
  const hoverDong = useMapStore((state) => state.hoverDong)
  const selectDong = useMapStore((state) => state.selectDong)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const recommendedDongCodes = useMemo(
    () => recommendedAreas.map((area) => area.dongCode),
    [recommendedAreas]
  )
  const searchResultAreas = useMemo(
    () => (hasSearchCondition ? searchAreas : []),
    [hasSearchCondition, searchAreas]
  )
  const viewportPadding = useMemo(
    () =>
      getMapViewportPadding({
        isLeftPanelOpen,
        isRightPanelOpen: selectedDongCode !== null,
      }),
    [isLeftPanelOpen, selectedDongCode]
  )

  useDongPolygonMap({
    adminAreas,
    containerRef: mapContainerRef,
    isDarkMode: resolvedTheme === "dark",
    mapFocusRequest,
    hoveredDongCode,
    recommendedDongCodes,
    searchResultAreas,
    selectedDongCode,
    viewportPadding,
    clearPolygonHover,
    focusMapOnDong,
    hoverDong,
    selectDong,
  })

  return (
    <div
      data-map-canvas
      className="relative h-full min-h-0 w-full overflow-hidden bg-background select-none"
    >
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
      {isAdminAreasLoading ? (
        <div className="absolute inset-x-4 top-4 z-10 max-w-sm rounded-lg border bg-card/95 p-3 shadow-sm">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
      ) : null}
      {isAdminAreasError ? (
        <div className="absolute inset-x-4 top-4 z-10 max-w-sm rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive shadow-sm">
          지도 행정동 데이터를 불러오지 못했습니다.
        </div>
      ) : null}
    </div>
  )
}
