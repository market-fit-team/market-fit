import { ArrowUpRightFromSquare, FileText, MapPin, X } from "lucide-react"
import { MarketPreviewSkeleton } from "@/features/map/components/preview/market-preview-skeleton"
import { PreviewTabs } from "@/features/map/components/preview/preview-tabs"
import type {
  MarketPreviewData,
  MarketPreviewIndustryRanking,
} from "@/features/map/types/map"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

type MarketPreviewPanelProps = {
  dongName: string
  isError: boolean
  isLoading: boolean
  onClose: () => void
  onOpenDetail: () => void
  preview?: MarketPreviewData
  sigunguName: string
}

const formatManwon = (value: number) =>
  `${Math.round(value / 10_000).toLocaleString()}만원`

function PreviewRankingCard({
  ranking,
}: {
  ranking: MarketPreviewIndustryRanking
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 shadow-sm">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {ranking.rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {ranking.industryName}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          점포 {ranking.storeCount.toLocaleString()}개 · 평균 월{" "}
          {formatManwon(ranking.estimatedSalesPerStore)}
        </p>
      </div>
    </li>
  )
}

export function MarketPreviewPanel({
  dongName,
  isError,
  isLoading,
  onClose,
  onOpenDetail,
  preview,
  sigunguName,
}: MarketPreviewPanelProps) {
  return (
    <Card className="h-full gap-0 overflow-hidden rounded-2xl border-border bg-card/95 py-0 shadow-xl backdrop-blur">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="border-b border-border bg-primary px-4 pt-5 pb-4 text-primary-foreground">
          <header className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-2.5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{dongName}</h2>
                <p className="mt-1 text-sm text-primary-foreground/60">
                  {sigunguName}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="상권 미리보기 닫기"
              className="shrink-0 text-primary-foreground/65 hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </header>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <div>
            {isLoading ? (
              <MarketPreviewSkeleton />
            ) : isError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-4 text-xs leading-relaxed text-destructive">
                상권 미리보기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
              </p>
            ) : !preview ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs leading-relaxed text-muted-foreground">
                선택한 행정동의 상권 미리보기 데이터가 없습니다.
              </p>
            ) : (
              <PreviewTabs
                preview={preview}
                salesContent={
                  <div>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      선택한 상권에서 추천매출이 높은 업종입니다.
                    </p>
                    {preview.industryRankings.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs leading-relaxed text-muted-foreground">
                        업종별 추정매출 데이터가 없습니다.
                      </p>
                    ) : (
                      <ol className="flex flex-col gap-2.5">
                        {preview.industryRankings.slice(0, 3).map((ranking) => (
                          <PreviewRankingCard
                            key={ranking.industryCode}
                            ranking={ranking}
                          />
                        ))}
                      </ol>
                    )}
                  </div>
                }
              />
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-muted p-4">
          <Button
            type="button"
            size="lg"
            onClick={onOpenDetail}
            className="w-full gap-2 border-transparent bg-primary text-primary-foreground shadow-none hover:bg-primary/90"
          >
            <FileText className="h-4 w-4" />
            상권 상세 보기
            <ArrowUpRightFromSquare className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
