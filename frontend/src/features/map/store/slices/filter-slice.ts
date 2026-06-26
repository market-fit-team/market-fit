import type { StateCreator } from "zustand"

export type FilterSlice = {
  appliedSearchKeyword: string
  executeTextSearch: (searchKeyword: string) => void
  searchKeyword: string
  resetFilters: () => void
  selectedMajorCategory: string
  selectedMinorCategory: string
  setSelectedIndustry: (
    selectedMajorCategory: string,
    selectedMinorCategory: string
  ) => void
  setSelectedMajorCategory: (selectedMajorCategory: string) => void
  setSelectedMinorCategory: (selectedMinorCategory: string) => void
}

// 백엔드 상권 검색 API로 전달하는 검색어와 업종 필터 값이다.
export const createFilterSlice: StateCreator<FilterSlice> = (set) => ({
  appliedSearchKeyword: "",
  executeTextSearch: (searchKeyword) => {
    const nextSearchKeyword = searchKeyword.trim()

    set({
      appliedSearchKeyword: nextSearchKeyword,
      searchKeyword: nextSearchKeyword,
    })
  },
  searchKeyword: "",
  resetFilters: () =>
    set({
      appliedSearchKeyword: "",
      searchKeyword: "",
      selectedMajorCategory: "all",
      selectedMinorCategory: "all",
    }),
  selectedMajorCategory: "all",
  selectedMinorCategory: "all",
  // 대분류·소분류를 한 번에 설정한다(업종 피커에서 소분류 선택 시 사용).
  setSelectedIndustry: (selectedMajorCategory, selectedMinorCategory) =>
    set({ selectedMajorCategory, selectedMinorCategory }),
  setSelectedMajorCategory: (selectedMajorCategory) =>
    set({
      selectedMajorCategory,
      selectedMinorCategory: "all",
    }),
  setSelectedMinorCategory: (selectedMinorCategory) =>
    set({ selectedMinorCategory }),
})
