import type { StateCreator } from "zustand"
import type { DongCode } from "@/features/map/types/map"

export type SelectionSlice = {
  selectedDongCode: DongCode | null
  selectDong: (selectedDongCode: DongCode | null) => void
}

// selectedDongCode가 선택의 단일 원천
// 지도 클릭·추천 목록·AI 채팅 모두 이 값을 갱신
export const createSelectionSlice: StateCreator<SelectionSlice> = (set) => ({
  selectedDongCode: null,
  selectDong: (selectedDongCode) => set({ selectedDongCode }),
})
