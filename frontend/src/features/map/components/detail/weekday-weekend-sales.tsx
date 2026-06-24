import { CalendarRange } from "lucide-react"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import type { SectorWeekdayWeekendSales } from "@/features/map/types/map"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"

type WeekdayWeekendSalesProps = {
  sales: SectorWeekdayWeekendSales[]
}

export function WeekdayWeekendSalesSection({
  sales,
}: WeekdayWeekendSalesProps) {
  const weekendStrongSectorCount = sales.filter(
    (item) => item.weekend > item.weekday
  ).length

  return (
    <section aria-labelledby="weekday-weekend-sales-title">
      <h3
        id="weekday-weekend-sales-title"
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <CalendarRange className="h-4 w-4 text-primary" />
        업종별 주중·주말 매출
      </h3>
      <div className="mt-4 space-y-4">
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          상위 {sales.length}개 업종 중{" "}
          <span className="font-semibold text-foreground">
            {weekendStrongSectorCount}개 업종
          </span>
          이 주말에 더 강합니다.
        </p>
        <ChartContainer
          config={{
            weekday: { label: "주중", color: "var(--chart-2)" },
            weekend: { label: "주말", color: "var(--chart-4)" },
          }}
          className="h-72 w-full"
        >
          <BarChart data={sales} margin={{ top: 8 }}>
            <XAxis
              dataKey="sector"
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) =>
                    `${name}: ${Number(value).toLocaleString()}만원`
                  }
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="weekday"
              name="주중"
              fill="var(--color-weekday)"
              radius={[5, 5, 0, 0]}
            />
            <Bar
              dataKey="weekend"
              name="주말"
              fill="var(--color-weekend)"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  )
}
