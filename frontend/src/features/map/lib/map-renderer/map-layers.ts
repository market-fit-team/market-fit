import type {
  FillLayerSpecification,
  FilterSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
} from "maplibre-gl"
import { mapPalette } from "@/features/map/lib/map-renderer/map-palette"
import type { DongCode } from "@/features/map/types/map"

type SymbolLayerLayout = NonNullable<SymbolLayerSpecification["layout"]>
type SymbolTextField = SymbolLayerLayout["text-field"]

// MapLibre source/layer id는 setFilter, setPaintProperty, 이벤트 바인딩에서 공유
export const DONG_SOURCE_ID = "seoul-dongs"
// 라벨은 폴리곤이 아닌 동별 대표점(centroid) 소스에서 그려 행정동당 1개만 노출
export const DONG_LABEL_SOURCE_ID = "seoul-dong-labels"
export const GU_BOUNDARY_SOURCE_ID = "seoul-gu-boundaries"
export const SEARCH_RESULT_SOURCE_ID = "market-search-result-points"
export const DONG_BASE_LAYER_ID = "seoul-dongs-base"
export const DONG_RECOMMENDED_LAYER_ID = "seoul-dongs-recommended"
export const DONG_HOVER_LAYER_ID = "seoul-dongs-hover"
export const DONG_SELECTED_LAYER_ID = "seoul-dongs-selected"
export const DONG_BOUNDARY_LAYER_ID = "seoul-dongs-boundary"
export const DONG_RECOMMENDED_BOUNDARY_LAYER_ID =
  "seoul-dongs-recommended-boundary"
export const DONG_HOVER_BOUNDARY_LAYER_ID = "seoul-dongs-hover-boundary"
export const DONG_SELECTED_BOUNDARY_LAYER_ID = "seoul-dongs-selected-boundary"
export const DONG_RECOMMENDED_LABEL_LAYER_ID = "seoul-dongs-recommended-label"
export const DONG_HOVER_LABEL_LAYER_ID = "seoul-dongs-hover-label"
export const DONG_SELECTED_LABEL_LAYER_ID = "seoul-dongs-selected-label"
export const GU_BOUNDARY_LAYER_ID = "seoul-gu-boundary"
export const SEARCH_RESULT_MARKER_LAYER_ID = "market-search-result-markers"
export const SEARCH_RESULT_LABEL_LAYER_ID = "market-search-result-labels"

// 빈 filter는 hover/selected 초기 상태에 사용
const EMPTY_FILTER: FilterSpecification = ["==", ["get", "code"], ""]

// 동 선택에서 단일 동 layer만 표시
export const getLayerFilterByCode = (code: DongCode | null) =>
  code
    ? (["==", ["get", "code"], code] satisfies FilterSpecification)
    : EMPTY_FILTER

// 동 추천에서 여러 동 layer를 한 번에 표시
export const getLayerFilterByCodes = (codes: DongCode[]) =>
  codes.length > 0
    ? ([
        "in",
        ["get", "code"],
        ["literal", codes],
      ] satisfies FilterSpecification)
    : EMPTY_FILTER

// 검색 결과 마커(📍+이름)와 라벨이 중복되지 않도록 해당 dongCode를 라벨에서 제외
export const excludeSearchResultCodes = (
  baseFilter: FilterSpecification,
  searchResultCodes: DongCode[]
): FilterSpecification =>
  searchResultCodes.length === 0
    ? baseFilter
    : ([
        "all",
        baseFilter,
        ["!", ["in", ["get", "code"], ["literal", searchResultCodes]]],
      ] as FilterSpecification)

export const createFillLayer = ({
  fillColor,
  fillOpacity,
  filter,
  id,
  source = DONG_SOURCE_ID,
}: {
  fillColor: string
  fillOpacity: number
  filter?: FillLayerSpecification["filter"]
  id: string
  source?: string
}): FillLayerSpecification => ({
  id,
  paint: {
    "fill-color": fillColor,
    "fill-opacity": fillOpacity,
  },
  source,
  type: "fill",
  ...(filter ? { filter } : {}),
})

export const createBoundaryLayer = ({
  filter,
  id,
  lineColor,
  lineOpacity,
  lineWidth,
}: {
  filter?: LineLayerSpecification["filter"]
  id: string
  lineColor: string
  lineOpacity: number
  lineWidth: number
}): LineLayerSpecification => ({
  id,
  paint: {
    "line-color": lineColor,
    "line-opacity": lineOpacity,
    "line-width": lineWidth,
  },
  source: DONG_SOURCE_ID,
  type: "line",
  ...(filter ? { filter } : {}),
})

const labelTextWithAlpha = [
  "case",
  ["has", "alpha"],
  ["concat", ["get", "name"], "\n", ["to-string", ["get", "alpha"]]],
  ["get", "name"],
] satisfies SymbolTextField

// hover는 이름, selected/recommended는 alpha property 같이 표시
export const createLabelLayer = ({
  filter,
  id,
  textColor,
  textField,
}: {
  filter: SymbolLayerSpecification["filter"]
  id: string
  textColor: string
  textField: SymbolTextField
}): SymbolLayerSpecification => ({
  filter,
  id,
  layout: {
    "text-allow-overlap": true,
    "text-field": textField,
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-size": 12,
  },
  paint: {
    "text-color": textColor,
    "text-halo-color": "#ffffff",
    "text-halo-width": 1.5,
  },
  source: DONG_LABEL_SOURCE_ID,
  type: "symbol",
})

// fill layer 추가 순서(시각 우선순위): base → recommended → hover → selected.
export const dongFillLayers = {
  base: createFillLayer({
    fillColor: mapPalette.visibleFill,
    fillOpacity: 0.55,
    id: DONG_BASE_LAYER_ID,
  }),
  hover: createFillLayer({
    fillColor: mapPalette.hoverFill,
    fillOpacity: 0.46,
    filter: getLayerFilterByCode(null),
    id: DONG_HOVER_LAYER_ID,
  }),
  recommended: createFillLayer({
    fillColor: mapPalette.recommendedFill,
    fillOpacity: 0.46,
    filter: getLayerFilterByCodes([]),
    id: DONG_RECOMMENDED_LAYER_ID,
  }),
  selected: createFillLayer({
    fillColor: mapPalette.activeFill,
    fillOpacity: 0.64,
    filter: getLayerFilterByCode(null),
    id: DONG_SELECTED_LAYER_ID,
  }),
} as const

export const dongBoundaryLayers = {
  base: createBoundaryLayer({
    id: DONG_BOUNDARY_LAYER_ID,
    lineColor: mapPalette.visibleBoundary,
    lineOpacity: 0.7,
    lineWidth: 1,
  }),
  hover: createBoundaryLayer({
    filter: getLayerFilterByCode(null),
    id: DONG_HOVER_BOUNDARY_LAYER_ID,
    lineColor: mapPalette.hoverBoundary,
    lineOpacity: 0.75,
    lineWidth: 1.8,
  }),
  recommended: createBoundaryLayer({
    filter: getLayerFilterByCodes([]),
    id: DONG_RECOMMENDED_BOUNDARY_LAYER_ID,
    lineColor: mapPalette.recommendedBoundary,
    lineOpacity: 0.65,
    lineWidth: 1.2,
  }),
  selected: createBoundaryLayer({
    filter: getLayerFilterByCode(null),
    id: DONG_SELECTED_BOUNDARY_LAYER_ID,
    lineColor: mapPalette.activeBoundary,
    lineOpacity: 0.9,
    lineWidth: 2.2,
  }),
} as const

export const dongLabelLayers = {
  hover: createLabelLayer({
    filter: getLayerFilterByCode(null),
    id: DONG_HOVER_LABEL_LAYER_ID,
    textColor: mapPalette.text,
    textField: ["get", "name"],
  }),
  recommended: createLabelLayer({
    filter: getLayerFilterByCodes([]),
    id: DONG_RECOMMENDED_LABEL_LAYER_ID,
    textColor: mapPalette.recommendedBoundary,
    textField: labelTextWithAlpha,
  }),
  selected: createLabelLayer({
    filter: getLayerFilterByCode(null),
    id: DONG_SELECTED_LABEL_LAYER_ID,
    textColor: mapPalette.activeBoundary,
    textField: labelTextWithAlpha,
  }),
} as const

export const guBoundaryLayer: LineLayerSpecification = {
  id: GU_BOUNDARY_LAYER_ID,
  paint: {
    "line-color": mapPalette.guBoundary,
    "line-opacity": 0.5,
    "line-width": 1.25,
  },
  source: GU_BOUNDARY_SOURCE_ID,
  type: "line",
}

export const searchResultMarkerLayer: SymbolLayerSpecification = {
  id: SEARCH_RESULT_MARKER_LAYER_ID,
  layout: {
    "text-allow-overlap": true,
    "text-anchor": "bottom",
    "text-field": "📍",
    "text-size": 26,
  },
  paint: {
    "text-color": mapPalette.searchMarkerFill,
    "text-halo-color": "#ffffff",
    "text-halo-width": 1.5,
  },
  source: SEARCH_RESULT_SOURCE_ID,
  type: "symbol",
}

export const searchResultLabelLayer: SymbolLayerSpecification = {
  id: SEARCH_RESULT_LABEL_LAYER_ID,
  layout: {
    "text-anchor": "top",
    "text-field": ["get", "name"],
    "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
    "text-offset": [0, 0.2],
    "text-size": 11,
  },
  paint: {
    "text-color": mapPalette.text,
    "text-halo-color": "#ffffff",
    "text-halo-width": 1.5,
  },
  source: SEARCH_RESULT_SOURCE_ID,
  type: "symbol",
}

export const polygonLayers = [
  dongFillLayers.base,
  dongFillLayers.recommended,
  dongFillLayers.hover,
  dongFillLayers.selected,
  dongBoundaryLayers.base,
  dongBoundaryLayers.recommended,
  dongBoundaryLayers.hover,
  dongBoundaryLayers.selected,
  dongLabelLayers.recommended,
  dongLabelLayers.hover,
  dongLabelLayers.selected,
  guBoundaryLayer,
  searchResultMarkerLayer,
  searchResultLabelLayer,
] as const
