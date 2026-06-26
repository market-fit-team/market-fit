import type { MarketFranchiseRecommendation } from "@/features/map/types/map"

type PreviewFranchiseRecommendationsProps = {
  franchises: MarketFranchiseRecommendation[]
}

export function PreviewFranchiseRecommendations({
  franchises,
}: PreviewFranchiseRecommendationsProps) {
  if (franchises.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs leading-relaxed text-muted-foreground">
        프랜차이즈 추천 데이터는 백엔드 응답 스펙이 확정되면 같은 탭에
        연결합니다.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {franchises.map((franchise) => (
        <div
          key={franchise.brandCode}
          className="rounded-lg border border-border px-3 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {franchise.brandName}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {franchise.companyName ?? "프랜차이즈"}
              {franchise.startupCostTotal == null
                ? ""
                : ` · 예상 창업 비용 ${franchise.startupCostTotal.toLocaleString()}만원`}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
