import type { StateCreator } from "zustand"
import type { MapTab, TradeAreaId } from "@/features/map/types/map"
import { districtsData } from "@/features/startup/lib/data"

export type SelectionSlice = {
  activeResultTab: MapTab
  selectedTradeAreaId: TradeAreaId | null
  setActiveResultTab: (activeResultTab: MapTab) => void
  setSelectedTradeAreaId: (selectedTradeAreaId: TradeAreaId | null) => void
}

// 선택 상태는 지도 하이라이트와 결과 도크를 함께 구동한다.
export const createSelectionSlice: StateCreator<SelectionSlice> = (set) => ({
  activeResultTab: "traffic",
  selectedTradeAreaId: districtsData[0]?.id ?? null,
  setActiveResultTab: (activeResultTab) => set({ activeResultTab }),
  setSelectedTradeAreaId: (selectedTradeAreaId) => set({ selectedTradeAreaId }),
})
