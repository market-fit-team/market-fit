import type { StateCreator } from "zustand"

export type LeftPanelMode = "recommendations" | "chat"

export type LayoutSlice = {
  closeLeftPanel: () => void
  isLeftPanelOpen: boolean
  leftPanelMode: LeftPanelMode
  openLeftPanel: () => void
  setLeftPanelMode: (leftPanelMode: LeftPanelMode) => void
}

// 사이드바 열림 여부는 개별 위젯 상태가 아니라 지도 레이아웃 상태다.
export const createLayoutSlice: StateCreator<LayoutSlice> = (set) => ({
  closeLeftPanel: () => set({ isLeftPanelOpen: false }),
  isLeftPanelOpen: true,
  leftPanelMode: "recommendations",
  openLeftPanel: () => set({ isLeftPanelOpen: true }),
  setLeftPanelMode: (leftPanelMode) => set({ leftPanelMode }),
})
