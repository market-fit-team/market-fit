import type { FeatureCollection, Geometry, Point, Position } from "geojson"
import type {
  GeoJSONSource,
  LngLatBoundsLike,
  Map,
  MapLayerMouseEvent,
} from "maplibre-gl"
import {
  DONG_BASE_LAYER_ID,
  DONG_BOUNDARY_LAYER_ID,
  DONG_HOVER_BOUNDARY_LAYER_ID,
  DONG_HOVER_LABEL_LAYER_ID,
  DONG_HOVER_LAYER_ID,
  DONG_LABEL_SOURCE_ID,
  DONG_RECOMMENDED_BOUNDARY_LAYER_ID,
  DONG_RECOMMENDED_LABEL_LAYER_ID,
  DONG_RECOMMENDED_LAYER_ID,
  DONG_SELECTED_BOUNDARY_LAYER_ID,
  DONG_SELECTED_LABEL_LAYER_ID,
  DONG_SELECTED_LAYER_ID,
  DONG_SOURCE_ID,
  GU_BOUNDARY_SOURCE_ID,
  SEARCH_RESULT_SOURCE_ID,
  excludeSearchResultCodes,
  getLayerFilterByCode,
  getLayerFilterByCodes,
  polygonLayers,
} from "@/features/map/lib/map-renderer/map-layers"
import type {
  AdminAreaMapData,
  MarketAreaListItem,
} from "@/features/map/types/map"
import type { DongCode } from "@/features/map/types/map"

export type DongPolygonMapActions = {
  clearPolygonHover: () => void
  focusMapOnDong: (dongCode: DongCode) => void
  hoverDong: (hoveredDongCode: DongCode | null) => void
  selectDong: (selectedDongCode: DongCode | null) => void
}

export type DongPolygonLayerState = {
  hoveredDongCode: DongCode | null
  recommendedDongCodes: DongCode[]
  searchResultAreas: MarketAreaListItem[]
  selectedDongCode: DongCode | null
}

type SearchResultMarkerProperties = {
  code: DongCode
  name: string
}

type SearchResultMarkerGeoJson = FeatureCollection<
  Point,
  SearchResultMarkerProperties
>

type DongLabelProperties = {
  code: DongCode
  name: string
}

type DongLabelGeoJson = FeatureCollection<Point, DongLabelProperties>

// 링(닫힌 폴리곤 외곽선)의 부호 있는 면적: MultiPolygon에서 가장 큰 조각 선택에 사용
const getRingSignedArea = (ring: Position[]) => {
  let area = 0

  for (let index = 0, length = ring.length - 1; index < length; index += 1) {
    const [x0, y0] = ring[index]
    const [x1, y1] = ring[index + 1]

    area += x0 * y1 - x1 * y0
  }

  return area / 2
}

// Polygon은 외곽 링, MultiPolygon은 면적이 가장 큰 조각의 외곽 링을 반환
const getLargestOuterRing = (geometry: Geometry): Position[] | null => {
  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ?? null
  }

  if (geometry.type === "MultiPolygon") {
    let largestRing: Position[] | null = null
    let largestArea = Number.NEGATIVE_INFINITY

    geometry.coordinates.forEach((polygon) => {
      const ring = polygon[0]

      if (!ring) {
        return
      }

      const area = Math.abs(getRingSignedArea(ring))

      if (area > largestArea) {
        largestArea = area
        largestRing = ring
      }
    })

    return largestRing
  }

  return null
}

// 라이브러리 없이 폴리곤 면적 가중 centroid를 계산해 라벨 대표점으로 사용
const getRepresentativePoint = (geometry: Geometry): Position | null => {
  const ring = getLargestOuterRing(geometry)

  if (!ring || ring.length === 0) {
    return null
  }

  let area = 0
  let centroidX = 0
  let centroidY = 0

  for (let index = 0, length = ring.length - 1; index < length; index += 1) {
    const [x0, y0] = ring[index]
    const [x1, y1] = ring[index + 1]
    const cross = x0 * y1 - x1 * y0

    area += cross
    centroidX += (x0 + x1) * cross
    centroidY += (y0 + y1) * cross
  }

  area /= 2

  // 면적이 0(중복 좌표 등)이면 정점 평균으로 폴백
  if (area === 0) {
    const sum = ring.reduce(
      (acc, [lng, lat]) => {
        acc.lng += lng
        acc.lat += lat
        return acc
      },
      { lat: 0, lng: 0 }
    )

    return [sum.lng / ring.length, sum.lat / ring.length]
  }

  const point: Position = [centroidX / (6 * area), centroidY / (6 * area)]

  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    return null
  }

  return point
}

const toDongLabelPoints = (
  dongGeoJson: AdminAreaMapData["dongGeoJson"]
): DongLabelGeoJson => ({
  features: dongGeoJson.features.flatMap((feature) => {
    const point = getRepresentativePoint(feature.geometry)

    if (!point) {
      return []
    }

    return [
      {
        geometry: { coordinates: point, type: "Point" as const },
        properties: {
          code: feature.properties.code,
          name: feature.properties.name,
        },
        type: "Feature" as const,
      },
    ]
  }),
  type: "FeatureCollection",
})

// fill/boundary는 검색 결과와 무관하게 그대로 표시하고,
// 라벨만 검색 결과 마커와 중복되지 않도록 별도 필터를 적용한다.
const recommendedShapeLayerIds = [
  DONG_RECOMMENDED_LAYER_ID,
  DONG_RECOMMENDED_BOUNDARY_LAYER_ID,
] as const

const hoverShapeLayerIds = [
  DONG_HOVER_LAYER_ID,
  DONG_HOVER_BOUNDARY_LAYER_ID,
] as const

const selectedShapeLayerIds = [
  DONG_SELECTED_LAYER_ID,
  DONG_SELECTED_BOUNDARY_LAYER_ID,
] as const

const hasLayer = (map: Map, layerId: string) => Boolean(map.getLayer(layerId))

const getEventDongCode = (event: MapLayerMouseEvent) => {
  const code = event.features?.[0]?.properties?.code

  return code == null ? null : String(code)
}

const getEmptySearchResultMarkers = (): SearchResultMarkerGeoJson => ({
  features: [],
  type: "FeatureCollection",
})

const toSearchResultMarkers = (
  areas: MarketAreaListItem[]
): SearchResultMarkerGeoJson => ({
  features: areas.map((area) => ({
    geometry: {
      coordinates: [area.centerLng, area.centerLat],
      type: "Point",
    },
    properties: {
      code: area.dongCode,
      name: area.dongName,
    },
    type: "Feature",
  })),
  type: "FeatureCollection",
})

export const getDongByCode = (
  adminAreas: AdminAreaMapData,
  code: DongCode | null
) =>
  adminAreas.dongGeoJson.features.find((dong) => dong.properties.code === code)
    ?.properties ?? null

export const getDongBoundsByCodes = (
  adminAreas: AdminAreaMapData,
  codes: DongCode[]
): LngLatBoundsLike | null => {
  const codeSet = new Set(codes)
  const bounds = {
    maxLat: Number.NEGATIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    minLng: Number.POSITIVE_INFINITY,
  }

  adminAreas.dongGeoJson.features.forEach((feature) => {
    if (!codeSet.has(feature.properties.code)) {
      return
    }

    const coordinates =
      feature.geometry.type === "Polygon"
        ? feature.geometry.coordinates.flat(1)
        : feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates.flat(2)
          : []

    coordinates.forEach(([lng, lat]) => {
      bounds.minLng = Math.min(bounds.minLng, lng)
      bounds.minLat = Math.min(bounds.minLat, lat)
      bounds.maxLng = Math.max(bounds.maxLng, lng)
      bounds.maxLat = Math.max(bounds.maxLat, lat)
    })
  })

  if (
    !Number.isFinite(bounds.minLng) ||
    !Number.isFinite(bounds.minLat) ||
    !Number.isFinite(bounds.maxLng) ||
    !Number.isFinite(bounds.maxLat)
  ) {
    return null
  }

  return [
    [bounds.minLng, bounds.minLat],
    [bounds.maxLng, bounds.maxLat],
  ]
}

const updateGeoJsonSource = (
  map: Map,
  sourceId: string,
  data: AdminAreaMapData["dongGeoJson"] | AdminAreaMapData["sigunguGeoJson"]
) => {
  const source = map.getSource(sourceId) as GeoJSONSource | undefined

  source?.setData(data)
}

export const syncSearchResultMarkers = (
  map: Map,
  areas: MarketAreaListItem[]
) => {
  const source = map.getSource(SEARCH_RESULT_SOURCE_ID) as
    | GeoJSONSource
    | undefined

  source?.setData(toSearchResultMarkers(areas))
}

export const syncDongPolygonSourceData = (
  map: Map,
  adminAreas: AdminAreaMapData
) => {
  updateGeoJsonSource(map, DONG_SOURCE_ID, adminAreas.dongGeoJson)
  updateGeoJsonSource(map, GU_BOUNDARY_SOURCE_ID, adminAreas.sigunguGeoJson)

  const labelSource = map.getSource(DONG_LABEL_SOURCE_ID) as
    | GeoJSONSource
    | undefined

  labelSource?.setData(toDongLabelPoints(adminAreas.dongGeoJson))
}

export const addDongPolygonLayers = (
  map: Map,
  adminAreas: AdminAreaMapData
) => {
  if (map.getSource(DONG_SOURCE_ID)) {
    syncDongPolygonSourceData(map, adminAreas)
    return
  }

  map.addSource(DONG_SOURCE_ID, {
    data: adminAreas.dongGeoJson,
    type: "geojson",
  })
  map.addSource(GU_BOUNDARY_SOURCE_ID, {
    data: adminAreas.sigunguGeoJson,
    type: "geojson",
  })
  map.addSource(DONG_LABEL_SOURCE_ID, {
    data: toDongLabelPoints(adminAreas.dongGeoJson),
    type: "geojson",
  })
  map.addSource(SEARCH_RESULT_SOURCE_ID, {
    data: getEmptySearchResultMarkers(),
    type: "geojson",
  })
  polygonLayers.forEach((layer) => {
    map.addLayer(layer)
  })
}

type BindDongPolygonEventsInput = DongPolygonMapActions & {
  map: Map
}

export const bindDongPolygonEvents = ({
  clearPolygonHover,
  focusMapOnDong,
  hoverDong,
  map,
  selectDong,
}: BindDongPolygonEventsInput) => {
  map.on("mousemove", DONG_BASE_LAYER_ID, (event: MapLayerMouseEvent) => {
    const code = getEventDongCode(event)

    if (!code) {
      return
    }

    map.getCanvas().style.cursor = "pointer"
    hoverDong(code)
  })

  map.on("mouseleave", DONG_BASE_LAYER_ID, () => {
    map.getCanvas().style.cursor = ""
    clearPolygonHover()
  })

  map.on("click", DONG_BASE_LAYER_ID, (event: MapLayerMouseEvent) => {
    const code = getEventDongCode(event)

    if (!code) {
      return
    }

    selectDong(code)
    focusMapOnDong(code)
  })
}

type SyncDongPolygonLayersInput = DongPolygonLayerState & {
  map: Map
}

export const syncDongPolygonLayers = ({
  hoveredDongCode,
  map,
  recommendedDongCodes,
  searchResultAreas,
  selectedDongCode,
}: SyncDongPolygonLayersInput) => {
  if (!hasLayer(map, DONG_BOUNDARY_LAYER_ID)) {
    return
  }

  const searchResultCodes = searchResultAreas.map((area) => area.dongCode)
  const recommendedFilter = getLayerFilterByCodes(recommendedDongCodes)
  const hoverFilter = getLayerFilterByCode(hoveredDongCode)
  const selectedFilter = getLayerFilterByCode(selectedDongCode)
  const hoverLabelFilter = getLayerFilterByCode(
    hoveredDongCode === selectedDongCode ? null : hoveredDongCode
  )

  recommendedShapeLayerIds.forEach((layerId) => {
    map.setFilter(layerId, recommendedFilter)
  })
  hoverShapeLayerIds.forEach((layerId) => {
    map.setFilter(layerId, hoverFilter)
  })
  selectedShapeLayerIds.forEach((layerId) => {
    map.setFilter(layerId, selectedFilter)
  })

  // 동 라벨은 검색 결과 핀의 이름 라벨과 겹치지 않도록 검색 결과 dongCode를 제외한다.
  map.setFilter(
    DONG_RECOMMENDED_LABEL_LAYER_ID,
    excludeSearchResultCodes(recommendedFilter, searchResultCodes)
  )
  map.setFilter(
    DONG_SELECTED_LABEL_LAYER_ID,
    excludeSearchResultCodes(selectedFilter, searchResultCodes)
  )
  map.setFilter(
    DONG_HOVER_LABEL_LAYER_ID,
    excludeSearchResultCodes(hoverLabelFilter, searchResultCodes)
  )

  syncSearchResultMarkers(map, searchResultAreas)
}
