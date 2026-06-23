import type { LngLatBoundsLike, Map, MapLayerMouseEvent } from "maplibre-gl"
import {
  DONG_BASE_LAYER_ID,
  DONG_BOUNDARY_LAYER_ID,
  DONG_HOVER_BOUNDARY_LAYER_ID,
  DONG_HOVER_LABEL_LAYER_ID,
  DONG_HOVER_LAYER_ID,
  DONG_RECOMMENDED_BOUNDARY_LAYER_ID,
  DONG_RECOMMENDED_LABEL_LAYER_ID,
  DONG_RECOMMENDED_LAYER_ID,
  DONG_SELECTED_BOUNDARY_LAYER_ID,
  DONG_SELECTED_LABEL_LAYER_ID,
  DONG_SELECTED_LAYER_ID,
  DONG_SOURCE_ID,
  GU_BOUNDARY_SOURCE_ID,
  getLayerFilterByCode,
  getLayerFilterByCodes,
  polygonLayers,
} from "@/features/map/lib/map-renderer/map-layers"
import {
  seoulDongGeoJson,
  seoulGuBoundaryGeoJson,
} from "@/features/map/lib/seoul-dong-polygons"
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
  selectedDongCode: DongCode | null
}

const recommendedLayerIds = [
  DONG_RECOMMENDED_LAYER_ID,
  DONG_RECOMMENDED_BOUNDARY_LAYER_ID,
  DONG_RECOMMENDED_LABEL_LAYER_ID,
] as const

const hoverLayerIds = [
  DONG_HOVER_LAYER_ID,
  DONG_HOVER_BOUNDARY_LAYER_ID,
] as const

const selectedLayerIds = [
  DONG_SELECTED_LAYER_ID,
  DONG_SELECTED_BOUNDARY_LAYER_ID,
  DONG_SELECTED_LABEL_LAYER_ID,
] as const

const hasLayer = (map: Map, layerId: string) => Boolean(map.getLayer(layerId))

const getEventDongCode = (event: MapLayerMouseEvent) => {
  const code = event.features?.[0]?.properties?.code

  return code == null ? null : String(code)
}

export const getDongByCode = (code: DongCode | null) =>
  seoulDongGeoJson.features.find((dong) => dong.properties.code === code)
    ?.properties ?? null

export const getDongBoundsByCodes = (
  codes: DongCode[]
): LngLatBoundsLike | null => {
  const codeSet = new Set(codes)
  const bounds = {
    maxLat: Number.NEGATIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    minLng: Number.POSITIVE_INFINITY,
  }

  seoulDongGeoJson.features.forEach((feature) => {
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

export const addDongPolygonLayers = (map: Map) => {
  if (map.getSource(DONG_SOURCE_ID)) {
    return
  }

  map.addSource(DONG_SOURCE_ID, {
    data: seoulDongGeoJson,
    type: "geojson",
  })
  map.addSource(GU_BOUNDARY_SOURCE_ID, {
    data: seoulGuBoundaryGeoJson,
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
  selectedDongCode,
}: SyncDongPolygonLayersInput) => {
  if (!hasLayer(map, DONG_BOUNDARY_LAYER_ID)) {
    return
  }

  const recommendedFilter = getLayerFilterByCodes(recommendedDongCodes)
  const hoverFilter = getLayerFilterByCode(hoveredDongCode)
  const selectedFilter = getLayerFilterByCode(selectedDongCode)

  recommendedLayerIds.forEach((layerId) => {
    map.setFilter(layerId, recommendedFilter)
  })
  hoverLayerIds.forEach((layerId) => {
    map.setFilter(layerId, hoverFilter)
  })
  selectedLayerIds.forEach((layerId) => {
    map.setFilter(layerId, selectedFilter)
  })
  map.setFilter(
    DONG_HOVER_LABEL_LAYER_ID,
    getLayerFilterByCode(
      hoveredDongCode === selectedDongCode ? null : hoveredDongCode
    )
  )
}
