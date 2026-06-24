"use client"

import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { PreviewSummary } from "@/features/map/components/preview/preview-summary"
import { PreviewTabs } from "@/features/map/components/preview/preview-tabs"
import { getSelectedTradeArea } from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

export function TradeAreaPreview() {
  const router = useRouter()
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const selectDong = useMapStore((state) => state.selectDong)
  const selectedTradeArea = getSelectedTradeArea(selectedDongCode)

  if (!selectedTradeArea) {
    return null
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <PreviewSummary
            tradeArea={selectedTradeArea}
            onClose={() => selectDong(null)}
          />
          <div className="mt-5">
            <PreviewTabs tradeArea={selectedTradeArea} />
          </div>
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button
            type="button"
            size="lg"
            onClick={() =>
              router.push(`/map/detail?district=${selectedTradeArea.id}`)
            }
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
