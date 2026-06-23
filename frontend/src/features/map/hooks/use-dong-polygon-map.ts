import { type RefObject, useEffect, useEffectEvent, useRef } from "react"
import type { Map, PaddingOptions } from "maplibre-gl"
import {
  koreaInteractionBounds,
  maxMapZoom,
  minMapZoom,
  seoulViewportBounds,
} from "@/features/map/lib/map-renderer/map-config"
import {
  BASE_MAP_BACKGROUND_LAYER_ID,
  BASE_MAP_RASTER_LAYER_ID,
  baseMapStyle,
} from "@/features/map/lib/map-renderer/map-style"
import {
  type DongPolygonMapActions,
  addDongPolygonLayers,
  bindDongPolygonEvents,
  getDongBoundsByCodes,
  getDongByCode,
  syncDongPolygonLayers,
} from "@/features/map/lib/map-renderer/polygon-runtime"
import type { DongCode, MapFocusRequest } from "@/features/map/types/map"

type UseDongPolygonMapInput = {
  containerRef: RefObject<HTMLDivElement | null>
  hoveredDongCode: DongCode | null
  isDarkMode: boolean
  mapFocusRequest: MapFocusRequest | null
  recommendedDongCodes: DongCode[]
  selectedDongCode: DongCode | null
  viewportPadding: PaddingOptions
} & DongPolygonMapActions

const syncBaseMapTheme = (map: Map, isDarkMode: boolean) => {
  if (map.getLayer(BASE_MAP_BACKGROUND_LAYER_ID)) {
    map.setPaintProperty(
      BASE_MAP_BACKGROUND_LAYER_ID,
      "background-color",
      isDarkMode ? "#020617" : "#f8fafc"
    )
  }

  if (!map.getLayer(BASE_MAP_RASTER_LAYER_ID)) {
    return
  }

  map.setPaintProperty(
    BASE_MAP_RASTER_LAYER_ID,
    "raster-brightness-min",
    isDarkMode ? 0.05 : 0
  )
  map.setPaintProperty(
    BASE_MAP_RASTER_LAYER_ID,
    "raster-brightness-max",
    isDarkMode ? 0.38 : 1
  )
  map.setPaintProperty(
    BASE_MAP_RASTER_LAYER_ID,
    "raster-saturation",
    isDarkMode ? -0.7 : 0
  )
  map.setPaintProperty(
    BASE_MAP_RASTER_LAYER_ID,
    "raster-contrast",
    isDarkMode ? 0.2 : 0
  )
}

export function useDongPolygonMap({
  containerRef,
  hoveredDongCode,
  isDarkMode,
  mapFocusRequest,
  recommendedDongCodes,
  selectedDongCode,
  viewportPadding,
  clearPolygonHover,
  focusMapOnDong,
  hoverDong,
  selectDong,
}: UseDongPolygonMapInput) {
  const mapRef = useRef<Map | null>(null)
  const isMapLoadedRef = useRef(false)
  const pendingFocusRequestRef = useRef<MapFocusRequest | null>(null)
  const fittedRecommendedKeyRef = useRef("")
  const onClearPolygonHover = useEffectEvent(() => {
    clearPolygonHover()
  })
  const onHoverDong = useEffectEvent((code: DongCode | null) => {
    hoverDong(code)
  })
  const onFocusMapOnDong = useEffectEvent((code: DongCode) => {
    focusMapOnDong(code)
  })
  const onSelectDong = useEffectEvent((code: DongCode | null) => {
    selectDong(code)
  })
  const syncCurrentLayerState = useEffectEvent((map: Map) => {
    syncDongPolygonLayers({
      hoveredDongCode,
      map,
      recommendedDongCodes,
      selectedDongCode,
    })
  })
  const syncCurrentBaseMapTheme = useEffectEvent((map: Map) => {
    syncBaseMapTheme(map, isDarkMode)
  })
  const fitCurrentRecommendedBounds = useEffectEvent((map: Map) => {
    const recommendedKey = recommendedDongCodes.join(",")

    if (
      recommendedDongCodes.length === 0 ||
      selectedDongCode !== null ||
      fittedRecommendedKeyRef.current === recommendedKey
    ) {
      return
    }

    const bounds = getDongBoundsByCodes(recommendedDongCodes)

    if (!bounds) {
      return
    }

    fittedRecommendedKeyRef.current = recommendedKey
    map.fitBounds(bounds, {
      duration: 500,
      padding: viewportPadding,
    })
  })
  const getCurrentViewportPadding = useEffectEvent(() => viewportPadding)
  const focusRequestedDong = useEffectEvent((focusRequest: MapFocusRequest) => {
    const map = mapRef.current

    if (!map || !isMapLoadedRef.current) {
      pendingFocusRequestRef.current = focusRequest
      return
    }

    const focusedDong = getDongByCode(focusRequest.dongCode)

    if (!focusedDong) {
      return
    }

    pendingFocusRequestRef.current = null
    map.flyTo({
      center: [focusedDong.centerLng, focusedDong.centerLat],
      essential: true,
      padding: viewportPadding,
      zoom: 13,
    })
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const container = containerRef.current
    let isMounted = true
    let resizeObserver: ResizeObserver | null = null
    let resizeFrameId: number | null = null

    const initializeMap = async () => {
      const maplibregl = await import("maplibre-gl")

      if (!isMounted || mapRef.current) {
        return
      }

      const map = new maplibregl.Map({
        attributionControl: false,
        bounds: seoulViewportBounds,
        container,
        fitBoundsOptions: {
          padding: getCurrentViewportPadding(),
        },
        localIdeographFontFamily: "sans-serif",
        maxBounds: koreaInteractionBounds,
        maxZoom: maxMapZoom,
        minZoom: minMapZoom,
        style: baseMapStyle,
      })

      mapRef.current = map
      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        "bottom-right"
      )
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
        }),
        "bottom-right"
      )

      resizeObserver = new ResizeObserver(() => map.resize())
      resizeObserver.observe(container)
      resizeFrameId = requestAnimationFrame(() => map.resize())

      void map.once("load", () => {
        if (!isMounted || !mapRef.current) {
          return
        }

        isMapLoadedRef.current = true
        syncCurrentBaseMapTheme(map)
        addDongPolygonLayers(map)
        bindDongPolygonEvents({
          clearPolygonHover: onClearPolygonHover,
          focusMapOnDong: onFocusMapOnDong,
          hoverDong: onHoverDong,
          map,
          selectDong: onSelectDong,
        })
        syncCurrentLayerState(map)
        fitCurrentRecommendedBounds(map)
        if (pendingFocusRequestRef.current) {
          focusRequestedDong(pendingFocusRequestRef.current)
        }
        map.resize()
      })
    }

    void initializeMap().catch((error: unknown) => {
      console.error("Map initialization failed.", error)
    })

    return () => {
      isMounted = false
      resizeObserver?.disconnect()
      if (resizeFrameId !== null) {
        cancelAnimationFrame(resizeFrameId)
      }
      mapRef.current?.remove()
      mapRef.current = null
      isMapLoadedRef.current = false
      pendingFocusRequestRef.current = null
      fittedRecommendedKeyRef.current = ""
    }
  }, [containerRef])

  useEffect(() => {
    const map = mapRef.current
    const layerState = {
      hoveredDongCode,
      recommendedDongCodes,
      selectedDongCode,
    }

    if (!map) {
      return
    }

    syncDongPolygonLayers({
      map,
      ...layerState,
    })
  }, [hoveredDongCode, recommendedDongCodes, selectedDongCode])

  useEffect(() => {
    const map = mapRef.current

    if (!map) {
      return
    }

    map.easeTo({
      duration: 300,
      padding: viewportPadding,
    })
  }, [viewportPadding])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !isMapLoadedRef.current) {
      return
    }

    syncBaseMapTheme(map, isDarkMode)
  }, [isDarkMode])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !isMapLoadedRef.current) {
      return
    }

    fitCurrentRecommendedBounds(map)
  }, [recommendedDongCodes, selectedDongCode])

  useEffect(() => {
    if (mapFocusRequest) {
      focusRequestedDong(mapFocusRequest)
    }
  }, [mapFocusRequest])
}
