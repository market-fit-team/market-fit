import { type RefObject, useEffect, useEffectEvent, useRef } from "react"
import type { Map, PaddingOptions } from "maplibre-gl"
import {
  koreaInteractionBounds,
  maxMapZoom,
  minMapZoom,
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
import type { DongCode, MapFocusRequest } from "@/features/map/types/map"

type UseDongPolygonMapInput = {
  containerRef: RefObject<HTMLDivElement | null>
  hoveredDongCode: DongCode | null
  mapFocusRequest: MapFocusRequest | null
  recommendedDongCodes: DongCode[]
  selectedDongCode: DongCode | null
  viewportPadding: PaddingOptions
} & DongPolygonMapActions

export function useDongPolygonMap({
  containerRef,
  hoveredDongCode,
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
        addDongPolygonLayers(map)
        bindDongPolygonEvents({
          clearPolygonHover: onClearPolygonHover,
          focusMapOnDong: onFocusMapOnDong,
          hoverDong: onHoverDong,
          map,
          selectDong: onSelectDong,
        })
        syncCurrentLayerState(map)
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
    if (mapFocusRequest) {
      focusRequestedDong(mapFocusRequest)
    }
  }, [mapFocusRequest])
}
