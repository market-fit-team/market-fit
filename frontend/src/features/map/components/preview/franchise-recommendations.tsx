import { Star } from "lucide-react"
import type { DistrictData } from "@/features/startup/lib/data"

type PreviewFranchiseRecommendationsProps = {
  tradeArea: DistrictData
}

export function PreviewFranchiseRecommendations({
  tradeArea,
}: PreviewFranchiseRecommendationsProps) {
  return (
    <div>
      <ul className="flex flex-col gap-2">
        {tradeArea.recommendedFranchises.slice(0, 3).map((franchise) => (
          <li
            key={franchise.name}
            className="rounded-lg border border-border px-3 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">
                  {franchise.name}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {franchise.sector} · 최소 자본금{" "}
                  {franchise.minCapital.toLocaleString()}만원
                </span>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-foreground">
                <Star className="size-3.5 fill-current text-amber-500" />
                {franchise.rating}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
