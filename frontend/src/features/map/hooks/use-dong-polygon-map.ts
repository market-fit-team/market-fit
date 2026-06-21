import { type RefObject, useEffect, useEffectEvent, useRef } from "react"
import type { Map } from "maplibre-gl"
import {
  focusedAreaPadding,
  koreaInteractionBounds,
  maxMapZoom,
  minMapZoom,
  overlayAwareViewportPadding,
  seoulViewportBounds,
} from "@/features/map/lib/map-renderer/map-config"
import { baseMapStyle } from "@/features/map/lib/map-renderer/map-style"
import {
  type DongPolygonMapActions,
  addDongPolygonLayers,
  bindDongPolygonEvents,
  getDongByCode,
  syncDongPolygonLayers,
} from "@/features/map/lib/map-renderer/polygon-runtime"
import type { MapFocusRequest } from "@/features/map/store/slices/map-interaction-slice"
import { type DongCode } from "@/features/map/types/map"

type UseDongPolygonMapInput = {
  containerRef: RefObject<HTMLDivElement | null>
  hoveredDongCode: DongCode | null
  mapFocusRequest: MapFocusRequest | null
  recommendedDongCodes: DongCode[]
  selectedDongCode: DongCode | null
} & DongPolygonMapActions

export function useDongPolygonMap({
  containerRef,
  hoveredDongCode,
  mapFocusRequest,
  recommendedDongCodes,
  selectedDongCode,
  clearPolygonHover,
  hoverDong,
  selectDong,
}: UseDongPolygonMapInput) {
  const mapRef = useRef<Map | null>(null)
  const onClearPolygonHover = useEffectEvent(() => {
    clearPolygonHover()
  })
  const onHoverDong = useEffectEvent((code: DongCode | null) => {
    hoverDong(code)
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
          padding: overlayAwareViewportPadding,
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

        addDongPolygonLayers(map)
        bindDongPolygonEvents({
          clearPolygonHover: onClearPolygonHover,
          hoverDong: onHoverDong,
          map,
          selectDong: onSelectDong,
        })
        syncCurrentLayerState(map)
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
    const focusedDong = getDongByCode(mapFocusRequest?.dongCode ?? null)

    if (!map || !focusedDong) {
      return
    }

    map.flyTo({
      center: [focusedDong.centerLng, focusedDong.centerLat],
      essential: true,
      padding: focusedAreaPadding,
      zoom: 13,
    })
  }, [mapFocusRequest])
}
