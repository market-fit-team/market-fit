import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { FilterBar } from "@/features/map/components/filter/filter-bar"
import { SearchResultDropdown } from "@/features/map/components/filter/search-result-dropdown"
import { useMarketAreaResults } from "@/features/map/hooks/use-market-area-results"
import { useMarketIndustries } from "@/features/map/hooks/use-market-industries"
import { useMapStore } from "@/features/map/store/map-store"
import type { MarketSearchArea } from "@/features/map/types/map"

// Filter는 MapView 상단의 가로 검색 바를 소유한다.
// 구/행정동/상권/프랜차이즈 검색어와 업종 필터를 백엔드 조회 조건으로 전달한다.
export function Filter() {
  const [closedResultKey, setClosedResultKey] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const appliedSearchKeyword = useMapStore(
    (state) => state.appliedSearchKeyword
  )
  const executeTextSearch = useMapStore((state) => state.executeTextSearch)
  const focusMapOnDong = useMapStore((state) => state.focusMapOnDong)
  const resetFilters = useMapStore((state) => state.resetFilters)
  const selectDong = useMapStore((state) => state.selectDong)
  const selectedMajorCategory = useMapStore(
    (state) => state.selectedMajorCategory
  )
  const selectedMinorCategory = useMapStore(
    (state) => state.selectedMinorCategory
  )
  const setSelectedMajorCategory = useMapStore(
    (state) => state.setSelectedMajorCategory
  )
  const setSelectedMinorCategory = useMapStore(
    (state) => state.setSelectedMinorCategory
  )

  const { areas, hasSearchCondition, isError, isLoading } =
    useMarketAreaResults()
  const {
    data: industryOptions = [],
    isError: isIndustryOptionsError,
    isLoading: isIndustryOptionsLoading,
  } = useMarketIndustries()
  const minorOptions = useMemo(
    () =>
      industryOptions.find(
        (option) => option.code === selectedMajorCategory
      )?.minors ?? [],
    [industryOptions, selectedMajorCategory]
  )
  const resultKey = [
    appliedSearchKeyword.trim(),
    selectedMajorCategory,
    selectedMinorCategory,
  ].join("|")
  const isResultOpen = hasSearchCondition && closedResultKey !== resultKey

  useEffect(() => {
    if (!isResultOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        filterRef.current?.contains(event.target)
      ) {
        return
      }

      setClosedResultKey(resultKey)
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [isResultOpen, resultKey])

  const handleResetFilters = () => {
    resetFilters()
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }
    setClosedResultKey("|all|all")
  }

  const handleExecuteTextSearch = () => {
    executeTextSearch(searchInputRef.current?.value ?? "")
    setClosedResultKey(null)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return
    }

    event.preventDefault()
    handleExecuteTextSearch()
  }

  const handleSelectArea = (area: MarketSearchArea) => {
    selectDong(area.dongCode)
    focusMapOnDong(area.dongCode)
    setClosedResultKey(resultKey)
  }

  const handleFilterPointerDown = () => {
    if (closedResultKey === resultKey) {
      setClosedResultKey(null)
    }
  }

  const handleClearSearchKeyword = () => {
    if (!searchInputRef.current) {
      return
    }

    searchInputRef.current.value = ""
    searchInputRef.current.focus()
  }

  return (
    <FilterBar
      appliedSearchKeyword={appliedSearchKeyword}
      filterRef={filterRef}
      hasSearchCondition={hasSearchCondition}
      industryOptions={industryOptions}
      isIndustryOptionsError={isIndustryOptionsError}
      isIndustryOptionsLoading={isIndustryOptionsLoading}
      minorOptions={minorOptions}
      onClearSearchKeyword={handleClearSearchKeyword}
      onExecuteTextSearch={handleExecuteTextSearch}
      onFilterPointerDown={handleFilterPointerDown}
      onResetFilters={handleResetFilters}
      onSearchFocus={() => {
        if (hasSearchCondition) {
          setClosedResultKey(null)
        }
      }}
      onSearchKeyDown={handleSearchKeyDown}
      onSelectMajorCategory={setSelectedMajorCategory}
      onSelectMinorCategory={setSelectedMinorCategory}
      resultCount={areas.length}
      resultDropdown={
        hasSearchCondition && isResultOpen ? (
          <SearchResultDropdown
            areas={areas}
            isError={isError}
            isLoading={isLoading}
            onClose={() => setClosedResultKey(resultKey)}
            onSelectArea={handleSelectArea}
          />
        ) : null
      }
      searchInputRef={searchInputRef}
      selectedMajorCategory={selectedMajorCategory}
      selectedMinorCategory={selectedMinorCategory}
    />
  )
}
