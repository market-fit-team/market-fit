"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Filter, MessageSquare } from "lucide-react"
import { MapChatWidget } from "@/features/agent/components/map-chat-widget/map-chat-widget"
import { CanvasWidget } from "@/features/map/components/canvas-widget/canvas-widget"
import { FilterWidget } from "@/features/map/components/filter-widget/filter-widget"
import { ResultWidget } from "@/features/map/components/result-widget/result-widget"
import {
  getInitialTradeAreaId,
  getPersistedPersona,
} from "@/features/map/lib/get-initial-trade-area"
import { getSelectedTradeArea } from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import { Button } from "@/shared/components/ui/button"

// MapView는 지도 페이지 프레임을 소유한다.
// 왼쪽 필터, 중앙 지도, 하단 결과, 오른쪽 에이전트 패널 배치를 여기서 결정한다.
export function MapView() {
  const searchParams = useSearchParams()
  const personaQuery = searchParams.get("persona")
  const isChatOpen = useMapStore((state) => state.isChatOpen)
  const isFilterOpen = useMapStore((state) => state.isFilterOpen)
  const closeChat = useMapStore((state) => state.closeChat)
  const openChat = useMapStore((state) => state.openChat)
  const openFilter = useMapStore((state) => state.openFilter)
  const selectedTradeAreaId = useMapStore((state) => state.selectedTradeAreaId)
  const setActivePersona = useMapStore((state) => state.setActivePersona)
  const setRecommendationsOnly = useMapStore(
    (state) => state.setRecommendationsOnly
  )
  const setSelectedTradeAreaId = useMapStore(
    (state) => state.setSelectedTradeAreaId
  )
  const selectedTradeArea = getSelectedTradeArea(selectedTradeAreaId)

  useEffect(() => {
    // 공유 링크에서는 라우트 쿼리가 저장된 온보딩 페르소나보다 우선한다.
    const nextPersona = personaQuery || getPersistedPersona()

    if (nextPersona) {
      setActivePersona(nextPersona)
      setRecommendationsOnly(true)
      setSelectedTradeAreaId(getInitialTradeAreaId(nextPersona))
      return
    }

    setActivePersona(null)
    setRecommendationsOnly(false)
    setSelectedTradeAreaId(getInitialTradeAreaId(null))
  }, [
    personaQuery,
    setActivePersona,
    setRecommendationsOnly,
    setSelectedTradeAreaId,
  ])

  return (
    <div className="relative flex h-[calc(100vh-64px)] flex-1 overflow-hidden bg-muted/40">
      {/* 왼쪽 사이드바는 레이아웃 껍데기만 맡고, 필터 폼은 FilterWidget이 소유한다. */}
      <div
        className={`absolute top-4 bottom-4 left-4 z-20 w-80 transition-transform duration-300 ${
          isFilterOpen ? "translate-x-0" : "-translate-x-[calc(100%+16px)]"
        }`}
      >
        <FilterWidget />
      </div>

      {!isFilterOpen && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={openFilter}
          className="absolute top-4 left-4 z-20 gap-1.5"
        >
          <Filter className="h-4 w-4 text-primary" />
          <span>필터 열기</span>
        </Button>
      )}

      {/* 지도는 모든 패널 아래에 고정되는 배경 레이어다. */}
      <div className="absolute inset-0 z-0">
        <CanvasWidget />
      </div>

      {/* 결과 도크는 왼쪽 사이드바 상태를 따라 겹치지 않게 배치한다. */}
      <div
        className={`absolute right-0 bottom-4 z-10 px-4 md:px-8 ${
          isFilterOpen ? "left-80" : "left-0"
        }`}
      >
        <ResultWidget />
      </div>

      {/* 오른쪽 사이드바는 레이아웃 껍데기만 맡고, 채팅 동작은 MapChatWidget이 소유한다. */}
      <div
        className={`absolute top-4 right-4 bottom-4 z-20 w-80 transition-transform duration-300 ${
          isChatOpen ? "translate-x-0" : "translate-x-[calc(100%+16px)]"
        }`}
      >
        <MapChatWidget
          selectedTradeArea={selectedTradeArea}
          onClose={closeChat}
        />
      </div>

      {!isChatOpen && (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={openChat}
          className="absolute top-4 right-4 z-20 gap-1.5"
        >
          <MessageSquare className="h-4 w-4 text-primary" />
          <span>AI 상담 비서</span>
        </Button>
      )}
    </div>
  )
}
