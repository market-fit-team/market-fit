import type { StateCreator } from "zustand"

export type LayoutSlice = {
  closeChat: () => void
  closeFilter: () => void
  isChatOpen: boolean
  isFilterOpen: boolean
  openChat: () => void
  openFilter: () => void
}

// 사이드바 열림 여부는 개별 위젯 상태가 아니라 지도 레이아웃 상태다.
export const createLayoutSlice: StateCreator<LayoutSlice> = (set) => ({
  closeChat: () => set({ isChatOpen: false }),
  closeFilter: () => set({ isFilterOpen: false }),
  isChatOpen: false,
  isFilterOpen: true,
  openChat: () => set({ isChatOpen: true }),
  openFilter: () => set({ isFilterOpen: true }),
})
