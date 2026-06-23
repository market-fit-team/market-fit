import type { StyleSpecification } from "maplibre-gl"
import { mapTileProvider } from "@/features/map/lib/map-renderer/map-tile-provider"

export const BASE_MAP_BACKGROUND_LAYER_ID = "background"
export const BASE_MAP_RASTER_LAYER_ID = "osm-raster"

// 행정동 polygon이 주 정보로 배경 지도는 가벼운 OSM raster tile만 사용
export const baseMapStyle: StyleSpecification = {
  layers: [
    {
      id: BASE_MAP_BACKGROUND_LAYER_ID,
      paint: {
        "background-color": "#f8fafc",
      },
      type: "background",
    },
    {
      id: BASE_MAP_RASTER_LAYER_ID,
      source: "osm",
      type: "raster",
    },
  ],
  sources: {
    osm: mapTileProvider,
  },
  version: 8,
}
