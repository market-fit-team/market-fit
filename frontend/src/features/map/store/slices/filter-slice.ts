import type { StateCreator } from "zustand"
import type { BudgetRange, TargetDemographic } from "@/features/map/types/map"

export type FilterSlice = {
  budgetRange: BudgetRange
  resetFilters: () => void
  selectedCategory: string
  setBudgetRange: (budgetRange: BudgetRange) => void
  setSelectedCategory: (selectedCategory: string) => void
  setTargetDemographic: (targetDemographic: TargetDemographic) => void
  targetDemographic: TargetDemographic
}

// 추천 목록을 2차 검색하는 필터 값이다.
export const createFilterSlice: StateCreator<FilterSlice> = (set) => ({
  budgetRange: "all",
  resetFilters: () =>
    set({
      budgetRange: "all",
      selectedCategory: "all",
      targetDemographic: "all",
    }),
  selectedCategory: "all",
  setBudgetRange: (budgetRange) => set({ budgetRange }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setTargetDemographic: (targetDemographic) => set({ targetDemographic }),
  targetDemographic: "all",
})
