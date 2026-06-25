import type { KeyboardEvent, ReactNode, Ref } from "react"
import { Search, X } from "lucide-react"
import type {
  IndustryMajorOption,
  IndustryMinorOption,
} from "@/features/map/lib/industry-filter-options"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/shared/components/ui/input-group"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/components/ui/native-select"

type FilterBarProps = {
  appliedSearchKeyword: string
  filterRef: Ref<HTMLDivElement>
  hasSearchCondition: boolean
  industryOptions: IndustryMajorOption[]
  isIndustryOptionsError: boolean
  isIndustryOptionsLoading: boolean
  minorOptions: IndustryMinorOption[]
  onClearSearchKeyword: () => void
  onExecuteTextSearch: () => void
  onFilterPointerDown: () => void
  onResetFilters: () => void
  onSearchFocus: () => void
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onSelectMajorCategory: (value: string) => void
  onSelectMinorCategory: (value: string) => void
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
  minorOptions,
  onClearSearchKeyword,
  onExecuteTextSearch,
  onFilterPointerDown,
  onResetFilters,
  onSearchFocus,
  onSearchKeyDown,
  onSelectMajorCategory,
  onSelectMinorCategory,
  resultDropdown,
  resultCount,
  searchInputRef,
  selectedMajorCategory,
  selectedMinorCategory,
}: FilterBarProps) {
  return (
    <Card
      ref={filterRef}
      className="overflow-hidden border bg-card py-0 shadow-sm"
      onPointerDown={onFilterPointerDown}
    >
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

        <NativeSelect
          value={selectedMajorCategory}
          onChange={(event) => onSelectMajorCategory(event.target.value)}
          className="w-36 shrink-0"
          disabled={isIndustryOptionsLoading || isIndustryOptionsError}
        >
          <NativeSelectOption value="all">
            {isIndustryOptionsLoading
              ? "업종 로딩 중"
              : isIndustryOptionsError
                ? "업종 로드 실패"
                : "전체 대분류"}
          </NativeSelectOption>
          {industryOptions.map((option) => (
            <NativeSelectOption key={option.code} value={option.code}>
              {option.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <NativeSelect
          value={selectedMinorCategory}
          onChange={(event) => onSelectMinorCategory(event.target.value)}
          className="w-40 shrink-0"
          disabled={
            selectedMajorCategory === "all" ||
            isIndustryOptionsLoading ||
            isIndustryOptionsError
          }
        >
          <NativeSelectOption value="all">전체 소분류</NativeSelectOption>
          {minorOptions.map((option) => (
            <NativeSelectOption key={option.code} value={option.code}>
              {option.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>

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

      {resultDropdown}
    </Card>
  )
}
