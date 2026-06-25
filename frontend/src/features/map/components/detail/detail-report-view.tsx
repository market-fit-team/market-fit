import { ArrowLeft } from "lucide-react"
import { DetailAnalysisSummary } from "@/features/map/components/detail/detail-analysis-summary"
import { DetailReportSections } from "@/features/map/components/detail/detail-report-sections"
import { DetailReportSkeleton } from "@/features/map/components/detail/detail-report-skeleton"
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
  summary: string
}

export function DetailReportView({
  dongCode,
  dongName,
  isError,
  isLoading,
  onBack,
  report,
  summary,
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

        <DetailAnalysisSummary summary={summary} />

        {/* 상세 카드 그리드 */}
        <div className="grid gap-4 lg:grid-cols-2">
          {!dongCode ? (
            <div className="rounded-xl border bg-card p-6 text-xs text-muted-foreground lg:col-span-2">
              선택된 행정동이 없습니다. 지도 탐색에서 행정동을 선택해주세요.
            </div>
          ) : isLoading ? (
            <DetailReportSkeleton />
          ) : isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-xs leading-relaxed text-destructive lg:col-span-2">
              상권 상세 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해
              주세요.
            </div>
          ) : !report ? (
            <div className="rounded-xl border border-dashed bg-card p-6 text-xs leading-relaxed text-muted-foreground lg:col-span-2">
              선택한 행정동의 상권 상세 데이터가 없습니다.
            </div>
          ) : (
            <>
              <DetailReportSections data={report} />
              <FranchiseStartupCostCard franchises={[]} />
              <FootTrafficChartCard points={report.footTraffic} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
