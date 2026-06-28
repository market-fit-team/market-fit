import { Activity } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type {
  FootTrafficData,
  HourlyFootTraffic,
} from "@/features/map/types/map"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"

type FootTrafficChartProps = {
  points: HourlyFootTraffic[]
}

type FootTrafficSummaryPanelProps = {
  footTraffic: FootTrafficData
}

const getOrderedPoints = (points: HourlyFootTraffic[]) =>
  [...points].sort((a, b) => Number(a.hour) - Number(b.hour))

const weekdayLabels: Record<string, string> = {
  FRI: "금요일",
  MON: "월요일",
  SAT: "토요일",
  SUN: "일요일",
  THU: "목요일",
  TUE: "화요일",
  WED: "수요일",
}

function FootTrafficSummaryPanel({
  footTraffic,
}: FootTrafficSummaryPanelProps) {
  const peakWeekday = footTraffic.peakWeekday
    ? (weekdayLabels[footTraffic.peakWeekday] ?? footTraffic.peakWeekday)
    : "-"
  const youngAdultRatio =
    footTraffic.youngAdultRatio === undefined
      ? "-"
      : `${footTraffic.youngAdultRatio.toFixed(1)}%`

  return (
    <aside className="border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
      <h3 className="text-xs font-semibold text-foreground">유동 요약</h3>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-1">
        <div>
          <dt className="text-[10px] text-muted-foreground">총 유동인구</dt>
          <dd className="mt-0.5 text-lg font-semibold text-foreground">
            {footTraffic.total.toLocaleString()}명
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">피크 시간대</dt>
          <dd className="mt-0.5 text-lg font-semibold text-foreground">
            {footTraffic.peakTimeSlot ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">피크 요일</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {peakWeekday}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">20·30대 비중</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {youngAdultRatio}
          </dd>
        </div>
      </dl>
    </aside>
  )
}

function FootTrafficChart({ points }: FootTrafficChartProps) {
  const chartData = getOrderedPoints(points)

  return (
    <ChartContainer
      config={{ traffic: { label: "유동인구", color: "var(--chart-4)" } }}
      className="h-72 w-full"
    >
      <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0 }}>
        <defs>
          <linearGradient
            id="hourly-foot-traffic-gradient"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="5%"
              stopColor="var(--color-traffic)"
              stopOpacity={0.4}
            />
            <stop
              offset="95%"
              stopColor="var(--color-traffic)"
              stopOpacity={0.03}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="hour"
          tickLine={false}
          axisLine={false}
          interval={2}
          tickFormatter={(hour) => `${Number(hour)}시`}
        />
        <YAxis tickLine={false} axisLine={false} width={64} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(hour) => `${hour}:00`}
              formatter={(value) =>
                `유동인구: ${Number(value).toLocaleString()}명`
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          name="유동인구"
          stroke="var(--color-traffic)"
          fill="url(#hourly-foot-traffic-gradient)"
          strokeWidth={2.5}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}

export function FootTrafficChartCard({
  footTraffic,
}: {
  footTraffic: FootTrafficData | null
}) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Activity className="h-4 w-4 text-primary" />
          시간대별 유동인구
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-center">
        {footTraffic ? (
          <>
            <div className="min-w-0 lg:self-center">
              <FootTrafficChart points={footTraffic.points} />
              <p className="mt-3 text-[10px] text-muted-foreground">
                서울시 상권분석서비스 행정동별 생활인구 기준
              </p>
            </div>
            <FootTrafficSummaryPanel footTraffic={footTraffic} />
          </>
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground lg:col-span-2">
            선택한 기간과 행정동에는 유동인구 데이터가 없습니다.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
