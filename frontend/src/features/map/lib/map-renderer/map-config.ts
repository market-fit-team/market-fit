import type { LngLatBoundsLike, PaddingOptions } from "maplibre-gl"

// 좌우 패널이 떠 있는 상태에서도 서울 전체 polygon이 보이도록 초기 bounds에 사용
export const seoulViewportBounds: LngLatBoundsLike = [
  [126.734, 37.413],
  [127.269, 37.715],
]

// 상호작용 범위는 한국 주변으로 제한
export const koreaInteractionBounds: LngLatBoundsLike = [
  [124.5, 32.8],
  [132.2, 39.6],
]

type GetMapViewportPaddingInput = {
  isLeftPanelOpen: boolean
  isRightPanelOpen: boolean
}

// 열린 패널 영역을 피해서 지도 중심과 선택 동을 표시
export const getMapViewportPadding = ({
  isLeftPanelOpen,
  isRightPanelOpen,
}: GetMapViewportPaddingInput): PaddingOptions => ({
  bottom: 32,
  left: isLeftPanelOpen ? 340 : 32,
  right: isRightPanelOpen ? 340 : 32,
  top: 96,
})

// 한국 전체까지는 축소 가능
export const minMapZoom = 5.5

// 행정동 polygon 확인에 필요한 정도까지만 확대 가능
export const maxMapZoom = 17
