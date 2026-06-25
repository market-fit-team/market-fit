"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DetailReportView } from "@/features/map/components/detail/detail-report-view"
import { useAdminAreas } from "@/features/map/hooks/use-admin-areas"
import { useMarketReport } from "@/features/map/hooks/use-market-report"

type DetailReportMode = "modal" | "page"

function DetailReportContent({ mode }: { mode: DetailReportMode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dongCode =
    searchParams.get("dongCode") || searchParams.get("district") || ""
  const { data: adminAreas } = useAdminAreas()
  const { data: report, isError, isLoading } = useMarketReport(dongCode)
  const dong = adminAreas?.dongGeoJson.features.find(
    (feature) => feature.properties.code === dongCode
  )?.properties

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
    <DetailReportView
      dongCode={dongCode}
      dongName={dong?.name ?? dongCode}
      isError={isError}
      isLoading={isLoading}
      onBack={handleBack}
      report={report}
      summary={
        dongCode
          ? `${dong?.sigunguName ?? "-"} · 행정동 코드 ${dongCode}`
          : "지도에서 행정동을 선택하면 상권 상세 리포트를 확인할 수 있습니다."
      }
    />
  )
}

export function DetailReport({ mode = "page" }: { mode?: DetailReportMode }) {
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
