import type { RasterSourceSpecification } from "maplibre-gl"

export const mapTileProvider = {
  attribution: "© OpenStreetMap contributors",
  tileSize: 256,
  tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
  type: "raster",
} satisfies RasterSourceSpecification
