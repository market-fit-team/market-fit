"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { DetailAiSummary } from "@/features/map/components/detail/detail-ai-summary"
import { DetailReportSections } from "@/features/map/components/detail/detail-report-sections"
import { FootTrafficChartCard } from "@/features/map/components/detail/foot-traffic-chart"
import { FranchiseStartupCostCard } from "@/features/map/components/detail/franchise-startup-cost-card"
import { detailReportMock } from "@/features/map/lib/detail-report-mock"
import { districtsData } from "@/features/startup/lib/data"

type DetailReportMode = "modal" | "page"

function DetailReportContent({ mode }: { mode: DetailReportMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const districtId = searchParams.get("district") || "1123064" // 기본값: 강남
  const district =
    districtsData.find((d) => d.id === districtId) || districtsData[0]

  // 모달(인터셉트)에서는 뒤로가기로 지도 슬롯만 닫는다. 직접 진입·새로고침한
  // 풀페이지에서는 히스토리가 없거나 외부일 수 있어 /map으로 안전하게 보낸다.
  const handleBack = () => {
    if (mode === "modal") {
      router.back()
      return
    }
    router.push("/map")
  }

  return (
    <div className="min-h-full bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            지도 탐색으로
          </button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {district.nameKo}
        </h1>

        <DetailAiSummary summary={district.desc} />

        {/* 상세 카드 그리드 */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 백엔드 연결 시 detailAnalyticsMock을 동코드 기준 fetch 값으로 교체한다. */}
          <DetailReportSections data={detailReportMock} />
          <FranchiseStartupCostCard
            franchises={district.recommendedFranchises}
          />
          <FootTrafficChartCard points={detailReportMock.footTraffic} />
        </div>
      </div>
    </div>
  )
}

export function DetailReport({
  mode = "page",
}: {
  mode?: DetailReportMode
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-muted/30 text-xs text-muted-foreground">
          상권 정보를 불러오는 중...
        </div>
      }
    >
      <DetailReportContent mode={mode} />
    </Suspense>
  )
}
