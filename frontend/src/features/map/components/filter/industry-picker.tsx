import { useMemo, useState } from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import type { IndustryMajorOption } from "@/features/map/lib/industry-filter-options"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { cn } from "@/shared/lib/utils"

type IndustryPickerProps = {
  industryOptions: IndustryMajorOption[]
  isError: boolean
  isLoading: boolean
  onSelectIndustry: (
    selectedMajorCategory: string,
    selectedMinorCategory: string
  ) => void
  selectedMajorCategory: string
  selectedMinorCategory: string
}

// 업종이 많아 단일 셀렉트로는 탐색이 어렵기 때문에,
// 대분류(좌)→소분류(우) 2단 브라우징과 이름 검색을 함께 제공하는 피커다.
export function IndustryPicker({
  industryOptions,
  isError,
  isLoading,
  onSelectIndustry,
  selectedMajorCategory,
  selectedMinorCategory,
}: IndustryPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeMajorCode, setActiveMajorCode] = useState("")

  // 소분류가 없는 대분류는 선택지가 없어 노출하지 않는다.
  const majors = useMemo(
    () => industryOptions.filter((option) => option.minors.length > 0),
    [industryOptions]
  )

  const selectedIndustryName = useMemo(() => {
    if (selectedMinorCategory === "all") {
      return null
    }

    for (const major of industryOptions) {
      const minor = major.minors.find(
        (item) => item.code === selectedMinorCategory
      )

      if (minor) {
        return minor.name
      }
    }

    return null
  }, [industryOptions, selectedMinorCategory])

  const activeMajor =
    majors.find((option) => option.code === activeMajorCode) ??
    majors.find((option) => option.code === selectedMajorCategory) ??
    majors[0] ??
    null

  const normalizedQuery = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!normalizedQuery) {
      return []
    }

    return majors.flatMap((major) =>
      major.minors
        .filter((minor) => minor.name.toLowerCase().includes(normalizedQuery))
        .map((minor) => ({ major, minor }))
    )
  }, [majors, normalizedQuery])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (nextOpen) {
      setQuery("")
      setActiveMajorCode(
        selectedMajorCategory !== "all"
          ? selectedMajorCategory
          : (majors[0]?.code ?? "")
      )
    }
  }

  const handleSelect = (majorCode: string, minorCode: string) => {
    onSelectIndustry(majorCode, minorCode)
    setOpen(false)
    setQuery("")
  }

  const triggerLabel = isLoading
    ? "업종 로딩 중"
    : isError
      ? "업종 로드 실패"
      : (selectedIndustryName ?? "전체 업종")

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || isError}
          className="h-8 w-44 shrink-0 justify-between font-normal"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[28rem] gap-0 p-0">
        <div className="border-b p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="업종명 검색 (예: 치킨, 카페)"
              className="h-8 pl-8 text-xs"
              aria-label="업종명 검색"
            />
          </div>
        </div>

        {normalizedQuery ? (
          <div className="max-h-72 overflow-y-auto p-1">
            {searchResults.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                검색 결과가 없습니다.
              </p>
            ) : (
              searchResults.map(({ major, minor }) => (
                <MinorRow
                  key={`${major.code}-${minor.code}`}
                  caption={major.name}
                  isSelected={minor.code === selectedMinorCategory}
                  label={minor.name}
                  onSelect={() => handleSelect(major.code, minor.code)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex max-h-72">
            <div className="w-40 shrink-0 overflow-y-auto border-r p-1">
              <button
                type="button"
                onClick={() => handleSelect("all", "all")}
                className={cn(
                  "flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
                  selectedMinorCategory === "all" &&
                    "font-medium text-foreground"
                )}
              >
                전체 업종
              </button>
              {majors.map((major) => (
                <button
                  key={major.code}
                  type="button"
                  onMouseEnter={() => setActiveMajorCode(major.code)}
                  onClick={() => setActiveMajorCode(major.code)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
                    activeMajor?.code === major.code &&
                      "bg-accent font-medium text-foreground"
                  )}
                >
                  <span className="truncate">{major.name}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 -rotate-90 opacity-50" />
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {activeMajor?.minors.map((minor) => (
                <MinorRow
                  key={minor.code}
                  isSelected={minor.code === selectedMinorCategory}
                  label={minor.name}
                  onSelect={() => handleSelect(activeMajor.code, minor.code)}
                />
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

type MinorRowProps = {
  caption?: string
  isSelected: boolean
  label: string
  onSelect: () => void
}

function MinorRow({ caption, isSelected, label, onSelect }: MinorRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent",
        isSelected && "font-medium text-foreground"
      )}
    >
      <span className="min-w-0 truncate">
        {label}
        {caption ? (
          <span className="ml-1.5 text-[11px] text-muted-foreground">
            {caption}
          </span>
        ) : null}
      </span>
      {isSelected ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
      ) : null}
    </button>
  )
}
