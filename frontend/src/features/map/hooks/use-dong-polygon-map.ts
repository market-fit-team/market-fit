import { type RefObject, useEffect, useEffectEvent, useRef } from "react"
import type * as MapLibreGl from "maplibre-gl"
import type { Map, Marker, PaddingOptions } from "maplibre-gl"
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
  syncDongPolygonSourceData,
} from "@/features/map/lib/map-renderer/polygon-runtime"
import type {
  AdminAreaMapData,
  DongCode,
  MapFocusRequest,
  MarketAreaListItem,
} from "@/features/map/types/map"

type UseDongPolygonMapInput = {
  adminAreas: AdminAreaMapData | null
  containerRef: RefObject<HTMLDivElement | null>
  hoveredDongCode: DongCode | null
  isDarkMode: boolean
  mapFocusRequest: MapFocusRequest | null
  recommendedDongCodes: DongCode[]
  searchResultAreas: MarketAreaListItem[]
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
  adminAreas,
  containerRef,
  hoveredDongCode,
  isDarkMode,
  mapFocusRequest,
  recommendedDongCodes,
  searchResultAreas,
  selectedDongCode,
  viewportPadding,
  clearPolygonHover,
  focusMapOnDong,
  hoverDong,
  selectDong,
}: UseDongPolygonMapInput) {
  const mapRef = useRef<Map | null>(null)
  // 기본 마커(maplibregl.Marker) 생성을 위해 lazy import한 maplibre 모듈을 보관한다.
  const maplibreRef = useRef<typeof MapLibreGl | null>(null)
  // 현재 지도에 떠 있는 검색 결과 핀 마커들. 검색 결과가 바뀔 때마다 통째로 교체한다.
  const searchMarkersRef = useRef<Marker[]>([])
  const isMapLoadedRef = useRef(false)
  const arePolygonEventsBoundRef = useRef(false)
  const arePolygonLayersReadyRef = useRef(false)
  const pendingFocusRequestRef = useRef<MapFocusRequest | null>(null)
  const fittedRecommendedKeyRef = useRef("")
  const fittedSearchKeyRef = useRef("")
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
      searchResultAreas,
      selectedDongCode,
    })
  })
  // 검색 결과를 기본 핀 마커로 그린다. 기존 마커를 모두 제거한 뒤 현재 결과로 다시 추가한다.
  const syncSearchMarkers = useEffectEvent((map: Map) => {
    const maplibregl = maplibreRef.current

    if (!maplibregl) {
      return
    }

    searchMarkersRef.current.forEach((marker) => marker.remove())
    searchMarkersRef.current = searchResultAreas.map((area) => {
      const marker = new maplibregl.Marker()
        .setLngLat([area.centerLng, area.centerLat])
        .addTo(map)
      const element = marker.getElement()

      element.style.cursor = "pointer"
      element.addEventListener("click", (event) => {
        // 폴리곤 클릭으로 전파되어 선택이 덮어써지지 않도록 막는다.
        event.stopPropagation()
        onSelectDong(area.dongCode)
        onFocusMapOnDong(area.dongCode)
      })

      return marker
    })
  })
  const syncCurrentBaseMapTheme = useEffectEvent((map: Map) => {
    syncBaseMapTheme(map, isDarkMode)
  })
  const fitCurrentRecommendedBounds = useEffectEvent((map: Map) => {
    const recommendedKey = recommendedDongCodes.join(",")

    if (
      !adminAreas ||
      recommendedDongCodes.length === 0 ||
      selectedDongCode !== null ||
      fittedRecommendedKeyRef.current === recommendedKey
    ) {
      return
    }

    const bounds = getDongBoundsByCodes(adminAreas, recommendedDongCodes)

    if (!bounds) {
      return
    }

    fittedRecommendedKeyRef.current = recommendedKey
    map.fitBounds(bounds, {
      duration: 500,
      padding: viewportPadding,
    })
  })
  // 검색 결과 세트가 바뀔 때 그 동들이 모두 보이도록 카메라를 맞춘다(동일 세트는 한 번만).
  const fitCurrentSearchBounds = useEffectEvent((map: Map) => {
    const searchCodes = searchResultAreas.map((area) => area.dongCode)
    const searchKey = searchCodes.join(",")

    // 결과가 비면 키를 초기화해, 같은 검색을 다시 했을 때 카메라를 다시 맞춘다.
    if (searchResultAreas.length === 0) {
      fittedSearchKeyRef.current = ""
      return
    }

    // 동이 선택된 상태여도 새 검색이면 결과로 카메라를 맞춘다(선택 가드 없음).
    if (!adminAreas || fittedSearchKeyRef.current === searchKey) {
      return
    }

    const bounds = getDongBoundsByCodes(adminAreas, searchCodes)

    if (!bounds) {
      return
    }

    fittedSearchKeyRef.current = searchKey
    map.fitBounds(bounds, {
      duration: 500,
      // 단일 결과에 과도하게 줌인되지 않도록 상한을 둔다.
      maxZoom: 15.5,
      padding: viewportPadding,
    })
  })
  const ensurePolygonLayers = useEffectEvent((map: Map) => {
    if (!adminAreas) {
      return
    }

    if (arePolygonLayersReadyRef.current) {
      syncDongPolygonSourceData(map, adminAreas)
    } else {
      addDongPolygonLayers(map, adminAreas)
      arePolygonLayersReadyRef.current = true
    }

    if (!arePolygonEventsBoundRef.current) {
      bindDongPolygonEvents({
        clearPolygonHover: onClearPolygonHover,
        focusMapOnDong: onFocusMapOnDong,
        hoverDong: onHoverDong,
        map,
        selectDong: onSelectDong,
      })
      arePolygonEventsBoundRef.current = true
    }

    syncCurrentLayerState(map)
  })
  const getCurrentViewportPadding = useEffectEvent(() => viewportPadding)
  const focusRequestedDong = useEffectEvent((focusRequest: MapFocusRequest) => {
    const map = mapRef.current

    if (!map || !isMapLoadedRef.current || !adminAreas) {
      pendingFocusRequestRef.current = focusRequest
      return
    }

    const focusedDong = getDongByCode(adminAreas, focusRequest.dongCode)

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

      maplibreRef.current = maplibregl

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
        ensurePolygonLayers(map)
        syncCurrentLayerState(map)
        syncSearchMarkers(map)
        fitCurrentRecommendedBounds(map)
        fitCurrentSearchBounds(map)
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
      searchMarkersRef.current.forEach((marker) => marker.remove())
      searchMarkersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
      maplibreRef.current = null
      isMapLoadedRef.current = false
      arePolygonEventsBoundRef.current = false
      arePolygonLayersReadyRef.current = false
      pendingFocusRequestRef.current = null
      fittedRecommendedKeyRef.current = ""
      fittedSearchKeyRef.current = ""
    }
  }, [containerRef])

  useEffect(() => {
    const map = mapRef.current
    const layerState = {
      hoveredDongCode,
      recommendedDongCodes,
      searchResultAreas,
      selectedDongCode,
    }

    if (!map) {
      return
    }

    ensurePolygonLayers(map)
    syncDongPolygonLayers({
      map,
      ...layerState,
    })
  }, [
    hoveredDongCode,
    recommendedDongCodes,
    searchResultAreas,
    selectedDongCode,
  ])

  // 검색 결과가 바뀌면 핀 마커를 다시 그리고, 결과 영역이 모두 보이도록 카메라를 맞춘다.
  useEffect(() => {
    const map = mapRef.current

    if (!map || !isMapLoadedRef.current) {
      return
    }

    syncSearchMarkers(map)
    fitCurrentSearchBounds(map)
  }, [searchResultAreas])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !isMapLoadedRef.current || !adminAreas) {
      return
    }

    ensurePolygonLayers(map)
    fitCurrentRecommendedBounds(map)
    fitCurrentSearchBounds(map)
    if (pendingFocusRequestRef.current) {
      focusRequestedDong(pendingFocusRequestRef.current)
    }
  }, [adminAreas])

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
