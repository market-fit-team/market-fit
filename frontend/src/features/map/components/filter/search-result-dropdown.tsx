import { Loader2, MapPin, SearchX, X } from "lucide-react"
import type { MarketSearchArea } from "@/features/map/types/map"
import { Button } from "@/shared/components/ui/button"

type SearchResultDropdownProps = {
  areas: MarketSearchArea[]
  isError: boolean
  isLoading: boolean
  onClose: () => void
  onSelectArea: (area: MarketSearchArea) => void
}

const formatManwon = (value: number) =>
  `${Math.round(value / 10_000).toLocaleString()}만원`

export function SearchResultDropdown({
  areas,
  isError,
  isLoading,
  onClose,
  onSelectArea,
}: SearchResultDropdownProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>검색 결과 {areas.length > 0 ? `${areas.length}개` : ""}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="검색 결과 닫기"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          조건에 맞는 지역을 찾는 중...
        </div>
      ) : null}

      {!isLoading && isError ? (
        <div className="px-3 py-4 text-xs text-destructive">
          검색 결과를 불러오지 못했습니다.
        </div>
      ) : null}

      {!isLoading && !isError && areas.length === 0 ? (
        <div className="flex items-start gap-2 px-3 py-4 text-xs text-muted-foreground">
          <SearchX className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-medium text-foreground">검색 결과가 없습니다.</p>
            <p className="mt-1">검색어를 바꾸거나 필터 조건을 줄여보세요.</p>
          </div>
        </div>
      ) : null}

      {!isLoading && !isError && areas.length > 0 ? (
        <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto p-1.5 md:grid-cols-2 xl:grid-cols-3">
          {areas.map((area) => (
            <Button
              key={area.dongCode}
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start gap-2 rounded-lg px-2 py-2 text-left"
              onClick={() => onSelectArea(area)}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {area.dongName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {area.industryName
                    ? `${area.sigunguName} · ${area.industryName}`
                    : area.sigunguName}
                </span>
                {area.rank || area.estimatedSalesAmount ? (
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {area.rank ? `매출 ${area.rank}위` : "매출 정보"}
                    {area.estimatedSalesAmount
                      ? ` · ${formatManwon(area.estimatedSalesAmount)}`
                      : ""}
                  </span>
                ) : null}
              </span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
