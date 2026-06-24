import { Activity } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { HourlyFootTraffic } from "@/features/map/types/map"
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

const getAverage = (values: number[]) =>
  values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length

const getOrderedPoints = (points: HourlyFootTraffic[]) =>
  [...points].sort((a, b) => Number(a.hour) - Number(b.hour))

function FootTrafficSummaryPanel({ points }: FootTrafficChartProps) {
  const orderedPoints = getOrderedPoints(points)
  const average = Math.round(
    getAverage(orderedPoints.map((point) => point.value))
  )
  const peak = orderedPoints.reduce(
    (currentPeak, point) =>
      point.value > currentPeak.value ? point : currentPeak,
    { hour: "-", value: 0 }
  )
  const quiet = orderedPoints.reduce(
    (currentQuiet, point) =>
      point.value < currentQuiet.value ? point : currentQuiet,
    { hour: "-", value: Number.POSITIVE_INFINITY }
  )
  const topHours = [...orderedPoints]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)

  return (
    <aside className="border-t pt-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
      <h3 className="text-xs font-semibold text-foreground">유동 요약</h3>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 lg:grid-cols-1">
        <div>
          <dt className="text-[10px] text-muted-foreground">시간당 평균</dt>
          <dd className="mt-0.5 text-lg font-semibold text-foreground">
            {average.toLocaleString()}명
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">피크 시간</dt>
          <dd className="mt-0.5 text-lg font-semibold text-foreground">
            {peak.hour === "-" ? "-" : `${peak.hour}:00`}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">피크 유동인구</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {peak.value.toLocaleString()}명
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-muted-foreground">한산 시간</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">
            {quiet.hour === "-" ? "-" : `${quiet.hour}:00`}
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t pt-4">
        <p className="text-[10px] text-muted-foreground">상위 시간대</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {topHours.map((point) => (
            <span
              key={point.hour}
              className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground"
            >
              {point.hour}:00
            </span>
          ))}
        </div>
      </div>
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
        <YAxis tickLine={false} axisLine={false} width={48} />
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

export function FootTrafficChartCard({ points }: FootTrafficChartProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Activity className="h-4 w-4 text-primary" />
          시간대별 유동인구
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-center">
        <div className="min-w-0 lg:self-center">
          <FootTrafficChart points={points} />
          <p className="mt-3 text-[10px] text-muted-foreground">
            서울시 상권분석서비스 행정동별 생활인구 기준
          </p>
        </div>
        <FootTrafficSummaryPanel points={points} />
      </CardContent>
    </Card>
  )
}
