import { create } from "zustand"

type ToolPolicyStore = {
  allowedToolNamesOverride: Set<string> | null
  setAllowedToolNamesOverride: (toolNames: Set<string> | null) => void
  resetToolPolicy: () => void
}

export const useToolPolicyStore = create<ToolPolicyStore>((set) => ({
  allowedToolNamesOverride: null,
  setAllowedToolNamesOverride: (toolNames) => {
    set({ allowedToolNamesOverride: toolNames })
  },
  resetToolPolicy: () => {
    set({ allowedToolNamesOverride: null })
  },
}))
