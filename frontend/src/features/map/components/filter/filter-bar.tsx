import type { KeyboardEvent, ReactNode, Ref } from "react"
import { Search, X } from "lucide-react"
import { IndustryPicker } from "@/features/map/components/filter/industry-picker"
import type { IndustryMajorOption } from "@/features/map/lib/industry-filter-options"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/shared/components/ui/input-group"

type FilterBarProps = {
  appliedSearchKeyword: string
  filterRef: Ref<HTMLDivElement>
  hasSearchCondition: boolean
  industryOptions: IndustryMajorOption[]
  isIndustryOptionsError: boolean
  isIndustryOptionsLoading: boolean
  onClearSearchKeyword: () => void
  onExecuteTextSearch: () => void
  onFilterPointerDown: () => void
  onResetFilters: () => void
  onSearchFocus: () => void
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onSelectIndustry: (
    selectedMajorCategory: string,
    selectedMinorCategory: string
  ) => void
  resultDropdown: ReactNode
  resultCount: number
  searchInputRef: Ref<HTMLInputElement>
  selectedMajorCategory: string
  selectedMinorCategory: string
}

export function FilterBar({
  appliedSearchKeyword,
  filterRef,
  hasSearchCondition,
  industryOptions,
  isIndustryOptionsError,
  isIndustryOptionsLoading,
  onClearSearchKeyword,
  onExecuteTextSearch,
  onFilterPointerDown,
  onResetFilters,
  onSearchFocus,
  onSearchKeyDown,
  onSelectIndustry,
  resultDropdown,
  resultCount,
  searchInputRef,
  selectedMajorCategory,
  selectedMinorCategory,
}: FilterBarProps) {
  return (
    <div
      ref={filterRef}
      className="relative"
      onPointerDown={onFilterPointerDown}
    >
      <Card className="overflow-hidden border bg-card py-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 overflow-visible px-3 py-2.5 text-xs">
          <div className="min-w-64 flex-1">
            <InputGroup className="bg-background">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInputRef}
                defaultValue={appliedSearchKeyword}
                onFocus={onSearchFocus}
                onKeyDown={onSearchKeyDown}
                placeholder="구·행정동·상권·프랜차이즈 검색"
                aria-label="지역 및 상권 검색"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  type="button"
                  size="icon-xs"
                  aria-label="검색어 지우기"
                  className="group-has-[input:placeholder-shown]/input-group:hidden"
                  onClick={onClearSearchKeyword}
                >
                  <X />
                </InputGroupButton>
                <InputGroupButton
                  type="button"
                  size="xs"
                  aria-label="검색 실행"
                  onClick={onExecuteTextSearch}
                >
                  검색
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </div>

          <IndustryPicker
            industryOptions={industryOptions}
            isError={isIndustryOptionsError}
            isLoading={isIndustryOptionsLoading}
            onSelectIndustry={onSelectIndustry}
            selectedMajorCategory={selectedMajorCategory}
            selectedMinorCategory={selectedMinorCategory}
          />

          <div className="ml-auto flex shrink-0 items-center gap-2 text-muted-foreground">
            <span>
              {hasSearchCondition ? `${resultCount}개 지역` : "조건 없음"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onResetFilters}
            >
              조건 초기화
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 검색 결과 드롭다운은 카드 아래에 떠서(absolute) 카드 높이에 영향을 주지 않는다. */}
      {resultDropdown ? (
        <div className="absolute top-full right-0 left-0 z-20 mt-1.5">
          {resultDropdown}
        </div>
      ) : null}
    </div>
  )
}
