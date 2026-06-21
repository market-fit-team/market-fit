"use client"

import { useMemo, useRef } from "react"
import { useDongPolygonMap } from "@/features/map/hooks/use-dong-polygon-map"
import { getRecommendedTradeAreaIds } from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"

// CanvasWidget은 지도 표면을 렌더링하고 polygon 상호작용 상태만 스토어에 기록
// 필터링/추천/선택 표시는 스토어 상태에서 파생, 지도 layer는 표시 역할
export function CanvasWidget() {
  const activePersona = useMapStore((state) => state.activePersona)
  const mapFocusRequest = useMapStore((state) => state.mapFocusRequest)
  const hoveredDongCode = useMapStore((state) => state.hoveredDongCode)
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const clearPolygonHover = useMapStore((state) => state.clearPolygonHover)
  const hoverDong = useMapStore((state) => state.hoverDong)
  const selectDong = useMapStore((state) => state.selectDong)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const recommendedDongCodes = useMemo(
    () => getRecommendedTradeAreaIds(activePersona),
    [activePersona]
  )

  useDongPolygonMap({
    containerRef: mapContainerRef,
    mapFocusRequest,
    hoveredDongCode,
    recommendedDongCodes,
    selectedDongCode,
    clearPolygonHover,
    hoverDong,
    selectDong,
  })

  return (
    <div
      data-map-canvas-widget
      className="relative h-full min-h-0 w-full overflow-hidden bg-background select-none"
    >
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}
