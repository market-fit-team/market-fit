import type { StyleSpecification } from "maplibre-gl"
import { mapTileProvider } from "@/features/map/lib/map-renderer/map-tile-provider"

// 행정동 polygon이 주 정보로 배경 지도는 가벼운 OSM raster tile만 사용
export const baseMapStyle: StyleSpecification = {
  layers: [
    {
      id: "background",
      paint: {
        "background-color": "#f8fafc",
      },
      type: "background",
    },
    {
      id: "osm-raster",
      source: "osm",
      type: "raster",
    },
  ],
  sources: {
    osm: mapTileProvider,
  },
  version: 8,
}
