"use client"

import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
import { DetailInsights } from "@/features/map/components/detail/detail-insights"
import { DetailSummary } from "@/features/map/components/detail/detail-summary"
import { getSelectedTradeArea } from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

// Detail은 선택된 상권 상세 패널의 상태와 화면 이동을 조정한다.
export function Detail() {
  const router = useRouter()
  const activeResultTab = useMapStore((state) => state.activeResultTab)
  const selectedDongCode = useMapStore((state) => state.selectedDongCode)
  const selectDong = useMapStore((state) => state.selectDong)
  const setActiveResultTab = useMapStore((state) => state.setActiveResultTab)
  const selectedTradeArea = getSelectedTradeArea(selectedDongCode)

  if (!selectedTradeArea) {
    return null
  }

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardContent className="flex min-h-0 flex-1 flex-col p-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <DetailSummary
            tradeArea={selectedTradeArea}
            onClose={() => selectDong(null)}
          />
          <div className="mt-5">
            <DetailInsights
              activeTab={activeResultTab}
              tradeArea={selectedTradeArea}
              onTabChange={setActiveResultTab}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border p-4">
          <Button
            type="button"
            size="lg"
            onClick={() =>
              router.push(`/report?district=${selectedTradeArea.id}`)
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
