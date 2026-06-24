import { SectorSalesRankingSection } from "@/features/map/components/detail/sector-sales-ranking"
import { WeekdayWeekendSalesSection } from "@/features/map/components/detail/weekday-weekend-sales"
import type {
  SectorSalesRank,
  SectorWeekdayWeekendSales,
} from "@/features/map/types/map"
import { Card, CardContent } from "@/shared/components/ui/card"

type SalesAnalysisCardProps = {
  rankings: SectorSalesRank[]
  weekdayWeekendSales: SectorWeekdayWeekendSales[]
}

export function SalesAnalysisCard({
  rankings,
  weekdayWeekendSales,
}: SalesAnalysisCardProps) {
  return (
    <Card className="lg:col-span-2">
      <CardContent className="space-y-8">
        <SectorSalesRankingSection rankings={rankings} />
        <div className="border-t" />
        <WeekdayWeekendSalesSection sales={weekdayWeekendSales} />
      </CardContent>
    </Card>
  )
}
