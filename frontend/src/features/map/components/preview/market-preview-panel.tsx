import { FileText } from "lucide-react"
import { MarketPreviewSkeleton } from "@/features/map/components/preview/market-preview-skeleton"
import { PreviewSummary } from "@/features/map/components/preview/preview-summary"
import { PreviewTabs } from "@/features/map/components/preview/preview-tabs"
import type { MarketPreviewData } from "@/features/map/types/map"
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
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <PreviewSummary
            dongName={dongName}
            onClose={onClose}
            sigunguName={sigunguName}
          />
          <div className="mt-5">
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
              <PreviewTabs preview={preview} />
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button
            type="button"
            size="lg"
            onClick={onOpenDetail}
            className="w-full gap-1.5"
          >
            <FileText className="h-4 w-4" />
            상권 상세 보기
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
