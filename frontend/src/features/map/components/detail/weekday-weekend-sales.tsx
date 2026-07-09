import { CalendarRange } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"
import type { WeekdayWeekendSalesSummary } from "@/features/map/types/map"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"

type WeekdayWeekendSalesProps = {
  sales: WeekdayWeekendSalesSummary | null
}

const WEEKDAY_WEEKEND_COLORS = {
  weekday: "var(--chart-1)",
  weekend: "var(--chart-2)",
} as const

const formatSalesAmount = (value: number) =>
  value >= 10000
    ? `${(value / 10000).toFixed(1)}억원`
    : `${value.toLocaleString()}만원`

export function WeekdayWeekendSalesSection({
  sales,
}: WeekdayWeekendSalesProps) {
  if (!sales) {
    return (
      <section aria-labelledby="weekday-weekend-sales-title">
        <h3
          id="weekday-weekend-sales-title"
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CalendarRange className="h-4 w-4" />
          </span>
          주중·주말 매출 비교
        </h3>
        <p className="mt-4 rounded-lg border border-dashed px-3 py-4 text-xs text-muted-foreground">
          선택한 기간과 행정동에는 매출 데이터가 없습니다.
        </p>
      </section>
    )
  }

  const chartData = [
    {
      fill: WEEKDAY_WEEKEND_COLORS.weekday,
      name: "주중",
      ratio: sales.weekdayRatio,
      value: sales.weekday,
    },
    {
      fill: WEEKDAY_WEEKEND_COLORS.weekend,
      name: "주말",
      ratio: sales.weekendRatio,
      value: sales.weekend,
    },
  ]
  const totalSales = sales.weekday + sales.weekend
  const strongerLabel = sales.weekday >= sales.weekend ? "주중" : "주말"

  return (
    <section aria-labelledby="weekday-weekend-sales-title">
      <h3
        id="weekday-weekend-sales-title"
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <CalendarRange className="h-4 w-4" />
        </span>
        주중·주말 매출 비교
      </h3>
      <div className="mt-4 grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-stretch">
        <div className="border-b border-border pb-5 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0">
          <div className="relative mx-auto h-56 w-56">
            <ChartContainer
              config={{ value: { label: "매출" } }}
              className="h-full w-full"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value, name) =>
                        `${name}: ${Number(value).toLocaleString()}만원`
                      }
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] text-muted-foreground">총 매출</span>
              <span className="text-base font-semibold text-foreground">
                {formatSalesAmount(totalSales)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="rounded-xl border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
            이 상권은{" "}
            <span className="font-semibold text-foreground">
              {strongerLabel}
            </span>{" "}
            매출 비중이 더 높습니다.
          </p>
          {chartData.map((item) => (
            <div
              key={item.name}
              className="rounded-xl border border-border px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: item.fill }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold text-foreground">
                  {formatSalesAmount(item.value)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: item.fill,
                    width: `${Math.min(item.ratio, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                {item.ratio.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
