"use client"

import { Sparkles } from "lucide-react"
import { Canvas } from "@/features/map/components/canvas/canvas"
import { Explore } from "@/features/map/components/explore/explore"
import { Filter } from "@/features/map/components/filter/filter"
import { TradeAreaPreview } from "@/features/map/components/preview/trade-area-preview"
import { useMapStore } from "@/features/map/store/map-store"
import { Button } from "@/shared/components/ui/button"

// MapView는 지도 페이지 프레임을 소유한다.
// 상단 필터 바, 왼쪽 추천/채팅 패널, 중앙 지도, 오른쪽 상세 패널 배치를 여기서 결정한다.
export function MapView() {
  const isLeftPanelOpen = useMapStore((state) => state.isLeftPanelOpen)
  const openLeftPanel = useMapStore((state) => state.openLeftPanel)
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-1 overflow-hidden bg-muted/40">
      {/* 지도는 모든 패널 아래에 고정되는 배경 레이어다. */}
      <div className="absolute inset-0 z-0">
        <Canvas />
      </div>

      {/* 상단 영역: 추천·AI 패널 열기 버튼(핵심 기능)과 검색/필터 바를 가로로 분리해 배치한다. */}
      <div
        className={`absolute top-4 z-30 flex items-stretch gap-2 transition-[right,left] duration-200 ${
          isLeftPanelOpen ? "left-[22rem]" : "left-4"
        } ${selectedDongCode ? "right-[22rem]" : "right-4"}`}
      >
        {/* 패널이 닫혔을 때만 노출. 흰색 카드형 버튼이며, 높이는 items-stretch로 옆 검색 박스에 자동으로 맞춘다. */}
        {!isLeftPanelOpen ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={openLeftPanel}
            className="h-auto shrink-0 gap-1.5 border bg-card px-3 font-semibold shadow-sm ring-1 ring-foreground/10 hover:bg-card"
            aria-label="추천·AI 패널 열기"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            추천·AI
          </Button>
        ) : null}

        <div className="min-w-0 flex-1">
          <Filter />
        </div>
      </div>

      {/* 왼쪽 패널: 공통 토글 헤더로 추천 목록과 AI 채팅을 한 자리에서 전환한다. */}
      {/* 패널이 닫혔을 때 다시 여는 토글은 검색 드롭다운에 가려지지 않도록 필터 바 좌측에 둔다. */}
      {isLeftPanelOpen ? (
        <div className="absolute top-4 bottom-4 left-4 z-20 w-80">
          <Explore />
        </div>
      ) : null}

      {/* 오른쪽 패널은 선택된 동의 상권 미리보기를 보여준다. */}
      {selectedDongCode && (
        <div className="absolute top-4 right-4 bottom-20 z-20 w-80">
          <TradeAreaPreview />
        </div>
      )}
    </div>
  )
}
