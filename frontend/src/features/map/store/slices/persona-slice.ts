import type { StateCreator } from "zustand"

export type PersonaSlice = {
  activePersona: string | null
  clearActivePersona: () => void
  setActivePersona: (activePersona: string | null) => void
}

// 페르소나 상태는 온보딩 결과와 지도 추천을 연결한다.
export const createPersonaSlice: StateCreator<PersonaSlice> = (set) => ({
  activePersona: null,
  clearActivePersona: () => set({ activePersona: null }),
  setActivePersona: (activePersona) => set({ activePersona }),
})
