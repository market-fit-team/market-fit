"use client"

import { PanelLeftOpen } from "lucide-react"
import { Canvas } from "@/features/map/components/canvas/canvas"
import { Explore } from "@/features/map/components/explore/explore"
import { Filter } from "@/features/map/components/filter/filter"
import { TradeAreaPreview } from "@/features/map/components/preview/trade-area-preview"
import { useRecommendedAreas } from "@/features/map/hooks/use-recommended-areas"
import { getSelectedTradeArea } from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import { Button } from "@/shared/components/ui/button"

// MapView는 지도 페이지 프레임을 소유한다.
// 상단 필터 바, 왼쪽 추천/채팅 패널, 중앙 지도, 오른쪽 상세 패널 배치를 여기서 결정한다.
export function MapView() {
  const isLeftPanelOpen = useMapStore((state) => state.isLeftPanelOpen)
  const openLeftPanel = useMapStore((state) => state.openLeftPanel)
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const selectedTradeArea = getSelectedTradeArea(selectedDongCode)
  const hasRecommendations = useRecommendedAreas().length > 0

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-1 overflow-hidden bg-muted/40">
      {/* 지도는 모든 패널 아래에 고정되는 배경 레이어다. */}
      <div className="absolute inset-0 z-0">
        <Canvas />
      </div>

      {/* 상단 필터 바: 추천 목록을 2차 검색하는 바. 추천이 없으면 노출하지 않는다. */}
      {hasRecommendations && (
        <div className="absolute top-4 right-4 left-4 z-20">
          <Filter />
        </div>
      )}

      {/* 왼쪽 패널: 공통 토글 헤더로 추천 목록과 AI 채팅을 한 자리에서 전환한다. */}
      {isLeftPanelOpen ? (
        <div className="absolute top-20 bottom-4 left-4 z-20 w-80">
          <Explore selectedTradeArea={selectedTradeArea} />
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={openLeftPanel}
          className="absolute top-20 left-4 z-20 gap-1.5"
        >
          <PanelLeftOpen className="h-4 w-4" />
          추천·AI 열기
        </Button>
      )}

      {/* 오른쪽 패널은 선택된 동의 상권 미리보기를 보여준다. */}
      {selectedDongCode && (
        <div className="absolute top-20 right-4 bottom-20 z-10 w-80">
          <TradeAreaPreview />
        </div>
      )}
    </div>
  )
}
