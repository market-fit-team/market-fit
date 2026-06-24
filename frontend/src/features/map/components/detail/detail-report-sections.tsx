import { MarketEnvironmentCard } from "@/features/map/components/detail/market-environment-card"
import { ResidentPopulationCard } from "@/features/map/components/detail/resident-population-card"
import { SalesAnalysisCard } from "@/features/map/components/detail/sales-analysis-card"
import type { DetailReportData } from "@/features/map/types/map"

type DetailReportSectionsProps = {
  data: DetailReportData
}

export function DetailReportSections({ data }: DetailReportSectionsProps) {
  return (
    <>
      <ResidentPopulationCard population={data.residentPopulation} />
      <MarketEnvironmentCard
        competition={data.competition}
        indicator={data.commercialChangeIndicator}
      />

      <SalesAnalysisCard
        rankings={data.sectorSalesRanking}
        weekdayWeekendSales={data.sectorWeekdayWeekendSales}
      />
    </>
  )
}
