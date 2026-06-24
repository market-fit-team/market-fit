import type { DistrictData } from "@/features/startup/lib/data"

type PreviewEstimatedSalesRankingProps = {
  tradeArea: DistrictData
}

export function PreviewEstimatedSalesRanking({
  tradeArea,
}: PreviewEstimatedSalesRankingProps) {
  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        선택한 상권에서 추정매출이 높은 업종입니다.
      </p>
      <ol className="flex flex-col gap-2">
        {tradeArea.topSectors.slice(0, 3).map((sector, index) => (
          <li
            key={sector.sector}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {sector.sector}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
