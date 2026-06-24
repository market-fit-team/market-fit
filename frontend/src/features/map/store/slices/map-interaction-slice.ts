import type { StateCreator } from "zustand"
import type { DongCode, MapFocusRequest } from "@/features/map/types/map"

export type MapInteractionSlice = {
  hoveredDongCode: DongCode | null
  mapFocusRequest: MapFocusRequest | null
  clearPolygonHover: () => void
  focusMapOnDong: (dongCode: DongCode) => void
  hoverDong: (hoveredDongCode: DongCode | null) => void
}

// 지도 표면의 일시적 제스처(hover, 이동)만 관리
export const createMapInteractionSlice: StateCreator<MapInteractionSlice> = (
  set
) => ({
  hoveredDongCode: null,
  mapFocusRequest: null,
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
})
