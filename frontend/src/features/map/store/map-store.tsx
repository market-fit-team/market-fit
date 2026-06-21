"use client"

import { type ReactNode, createContext, useContext, useState } from "react"
import { createStore, useStore } from "zustand"
import {
  type FilterSlice,
  createFilterSlice,
} from "@/features/map/store/slices/filter-slice"
import {
  type LayoutSlice,
  createLayoutSlice,
} from "@/features/map/store/slices/layout-slice"
import {
  type PersonaSlice,
  createPersonaSlice,
} from "@/features/map/store/slices/persona-slice"
import {
  type MapInteractionSlice,
  createMapInteractionSlice,
} from "@/features/map/store/slices/map-interaction-slice"
import {
  type SelectionSlice,
  createSelectionSlice,
} from "@/features/map/store/slices/selection-slice"

export type MapState = FilterSlice &
  LayoutSlice &
  PersonaSlice &
  MapInteractionSlice &
  SelectionSlice

// 지도 스토어는 MapStoreProvider 범위에 묶어서 라우트가 다시 마운트되면 UI 상태도 새로 시작한다.
const createMapStore = (initialState?: Partial<MapState>) =>
  createStore<MapState>()((set, get, api) => ({
    ...createFilterSlice(set, get, api),
    ...createLayoutSlice(set, get, api),
    ...createPersonaSlice(set, get, api),
    ...createMapInteractionSlice(set, get, api),
    ...createSelectionSlice(set, get, api),
    ...initialState,
  }))

type MapStoreApi = ReturnType<typeof createMapStore>

const MapStoreContext = createContext<MapStoreApi | undefined>(undefined)

type MapStoreProviderProps = {
  children: ReactNode
  initialState?: Partial<MapState>
}

export function MapStoreProvider({
  children,
  initialState,
}: MapStoreProviderProps) {
  const [store] = useState(() => createMapStore(initialState))

  return (
    <MapStoreContext.Provider value={store}>
      {children}
    </MapStoreContext.Provider>
  )
}

export function useMapStore<T>(selector: (state: MapState) => T): T {
  const mapStoreContext = useContext(MapStoreContext)

  if (!mapStoreContext) {
    throw new Error("useMapStore must be used within MapStoreProvider")
  }

  return useStore(mapStoreContext, selector)
}
