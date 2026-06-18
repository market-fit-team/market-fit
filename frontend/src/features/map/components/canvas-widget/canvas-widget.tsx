"use client"

import { districtShapes, mapPalette } from "@/features/map/lib/map-constants"
import {
  getFilteredTradeAreaIds,
  getSelectedTradeArea,
} from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import { districtsData, personaResults } from "@/features/startup/lib/data"
import { Card, CardContent } from "@/shared/components/ui/card"

// CanvasWidget은 지도 표면을 렌더링하고 선택된 상권만 스토어에 기록한다.
// 필터링은 스토어 상태에서 파생해서 SVG는 표시 역할에 머물게 한다.
export function CanvasWidget() {
  const activePersona = useMapStore((state) => state.activePersona)
  const budgetRange = useMapStore((state) => state.budgetRange)
  const recommendationsOnly = useMapStore((state) => state.recommendationsOnly)
  const selectedCategory = useMapStore((state) => state.selectedCategory)
  const selectedTradeAreaId = useMapStore((state) => state.selectedTradeAreaId)
  const setSelectedTradeAreaId = useMapStore(
    (state) => state.setSelectedTradeAreaId
  )
  const targetDemographic = useMapStore((state) => state.targetDemographic)

  const filteredTradeAreaIds = getFilteredTradeAreaIds({
    activePersona,
    budgetRange,
    recommendationsOnly,
    selectedCategory,
    targetDemographic,
  })
  const selectedTradeArea = getSelectedTradeArea(selectedTradeAreaId)

  return (
    <div className="relative flex h-full flex-1 items-center justify-center bg-background select-none">
      <svg
        viewBox="0 0 800 500"
        className="h-full max-h-[85vh] w-full p-4 text-xs font-medium"
      >
        <defs>
          <pattern
            id="mapGrid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={mapPalette.grid}
              strokeWidth="1"
              opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapGrid)" />

        <path
          d="M 50,300 Q 150,280 250,280 T 450,320 T 650,270 T 750,290"
          fill="none"
          stroke={mapPalette.riverOuter}
          strokeWidth="38"
          strokeLinecap="round"
          opacity="0.8"
        />
        <path
          d="M 50,300 Q 150,280 250,280 T 450,320 T 650,270 T 750,290"
          fill="none"
          stroke={mapPalette.riverInner}
          strokeWidth="12"
          strokeLinecap="round"
          opacity="0.9"
        />
        <text
          x="350"
          y="305"
          fill={mapPalette.riverLabel}
          opacity="0.35"
          className="text-xs font-semibold italic"
        >
          Han River
        </text>

        {districtShapes.map((shape) => {
          const district = districtsData.find(
            (currentDistrict) => currentDistrict.id === shape.id
          )

          if (!district) {
            return null
          }

          const isSelected = selectedTradeArea?.id === district.id
          const isVisible = filteredTradeAreaIds.has(district.id)
          const isRecommended = Boolean(
            activePersona &&
            personaResults[activePersona]?.recommendedDistricts.includes(
              district.id
            )
          )

          return (
            <g
              key={district.id}
              onClick={() => {
                setSelectedTradeAreaId(district.id)
              }}
              className="group cursor-pointer"
            >
              <polygon
                points={shape.points}
                fill={
                  isSelected
                    ? mapPalette.activeFill
                    : isVisible
                      ? mapPalette.visibleFill
                      : mapPalette.mutedFill
                }
                stroke={
                  isSelected
                    ? mapPalette.activeStroke
                    : isVisible
                      ? mapPalette.visibleStroke
                      : mapPalette.mutedStroke
                }
                strokeWidth={isSelected ? 2.5 : 1}
                className="transition-[fill,stroke] duration-200 group-hover:opacity-90"
              />
              {isRecommended && (
                <circle
                  cx={shape.markerX}
                  cy={shape.markerY}
                  r="4"
                  fill={mapPalette.marker}
                  className="animate-pulse"
                />
              )}
              <text
                x={shape.labelX}
                y={shape.labelY}
                fill={isSelected ? mapPalette.activeLabel : mapPalette.label}
                className="pointer-events-none text-xs font-semibold"
              >
                {district.nameKo}
              </text>
              <text
                x={shape.labelX}
                y={shape.statsY}
                fill={
                  isSelected ? mapPalette.activeSubLabel : mapPalette.subLabel
                }
                className="pointer-events-none font-mono text-[9px]"
              >
                {district.avgSales.toLocaleString()}만원
              </text>
            </g>
          )
        })}
      </svg>

      <Card size="sm" className="absolute bottom-4 left-4 z-10 gap-2.5">
        <CardContent className="text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-4 rounded-sm border"
              style={{
                backgroundColor: mapPalette.activeFill,
                borderColor: mapPalette.activeStroke,
              }}
            ></span>
            <span>선택된 상권</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-2.5 w-4 rounded-sm border"
              style={{
                backgroundColor: mapPalette.visibleFill,
                borderColor: mapPalette.visibleStroke,
              }}
            ></span>
            <span>필터 조건 충족</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="h-2.5 w-4 rounded-sm border"
              style={{
                backgroundColor: mapPalette.mutedFill,
                borderColor: mapPalette.mutedStroke,
              }}
            ></span>
            <span>기타 상권</span>
          </div>
          {activePersona && (
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary"></span>
              <span className="text-xs font-medium text-primary">
                내 성향 추천 상권
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
