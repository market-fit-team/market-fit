import { ArrowLeft } from "lucide-react"
import { DetailReportSections } from "@/features/map/components/detail/detail-report-sections"
import { DetailReportSkeleton } from "@/features/map/components/detail/detail-report-skeleton"
import { DetailReportStateCard } from "@/features/map/components/detail/detail-report-state-card"
import { FootTrafficChartCard } from "@/features/map/components/detail/foot-traffic-chart"
import { FranchiseStartupCostCard } from "@/features/map/components/detail/franchise-startup-cost-card"
import type { DetailReportData } from "@/features/map/types/map"

type DetailReportViewProps = {
  dongCode: string
  dongName: string
  isError: boolean
  isLoading: boolean
  onBack: () => void
  report?: DetailReportData
}

export function DetailReportView({
  dongCode,
  dongName,
  isError,
  isLoading,
  onBack,
  report,
}: DetailReportViewProps) {
  return (
    <div className="min-h-full bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            지도 탐색으로
          </button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {dongName}
        </h1>

        {/* 상세 카드 그리드 */}
        <div className="grid gap-4 lg:grid-cols-2">
          {!dongCode ? (
            <DetailReportStateCard state="no-selection" />
          ) : isLoading ? (
            <DetailReportSkeleton />
          ) : isError ? (
            <DetailReportStateCard state="error" />
          ) : !report ? (
            <DetailReportStateCard state="empty" />
          ) : (
            <>
              <DetailReportSections data={report} />
              <FranchiseStartupCostCard
                franchises={report.franchiseRecommendations}
              />
              <FootTrafficChartCard footTraffic={report.footTraffic} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
