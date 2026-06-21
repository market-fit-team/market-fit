import type { StateCreator } from "zustand"
import type { DongCode } from "@/features/map/types/map"

export type MapFocusRequest = {
  dongCode: DongCode
  requestId: number
}

export type MapInteractionSlice = {
  hoveredDongCode: DongCode | null
  mapFocusRequest: MapFocusRequest | null
  selectedDongCode: DongCode | null
  clearPolygonHover: () => void
  focusMapOnDong: (dongCode: DongCode) => void
  hoverDong: (hoveredDongCode: DongCode | null) => void
  selectDong: (selectedDongCode: DongCode | null) => void
}

// polygon 상태는 hover와 select를 분리해서 관리
export const createMapInteractionSlice: StateCreator<MapInteractionSlice> = (
  set
) => ({
  hoveredDongCode: null,
  mapFocusRequest: null,
  selectedDongCode: null,
  clearPolygonHover: () =>
    set({
      hoveredDongCode: null,
    }),
  focusMapOnDong: (dongCode) =>
    set((state) => ({
      mapFocusRequest: {
        dongCode,
        requestId: (state.mapFocusRequest?.requestId ?? 0) + 1,
      },
    })),
  hoverDong: (hoveredDongCode) =>
    set({
      hoveredDongCode,
    }),
  selectDong: (selectedDongCode) =>
    set({
      selectedDongCode,
    }),
})
