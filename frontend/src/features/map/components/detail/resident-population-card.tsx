import { Users } from "lucide-react"
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts"
import type { ResidentPopulation } from "@/features/map/types/map"
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

type ResidentPopulationCardProps = {
  population: ResidentPopulation
}

export function ResidentPopulationCard({
  population,
}: ResidentPopulationCardProps) {
  const chartData = population.byAge.map((item) => ({
    ...item,
    total: item.male + item.female,
  }))
  const malePopulation = chartData.reduce((total, item) => total + item.male, 0)
  const femalePopulation = chartData.reduce(
    (total, item) => total + item.female,
    0
  )
  const dominantAgeGroup = chartData.reduce(
    (dominant, item) => (item.total > dominant.total ? item : dominant),
    { ageGroup: "-", male: 0, female: 0, total: 0 }
  )
  const populationTotal = Math.max(population.total, 1)
  const maleRatio = Math.round((malePopulation / populationTotal) * 100)
  const femaleRatio = Math.round((femalePopulation / populationTotal) * 100)

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Users className="h-4 w-4 text-primary" />
          연령대별 성별 상주인구
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid divide-y rounded-lg bg-muted/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-3 py-3">
            <span className="block text-[10px] text-muted-foreground">
              총 상주인구
            </span>
            <span className="text-sm font-semibold text-foreground">
              {population.total.toLocaleString()}명
            </span>
          </div>
          <div className="px-3 py-3">
            <span className="block text-[10px] text-muted-foreground">
              최다 연령대
            </span>
            <span className="text-sm font-semibold text-foreground">
              {dominantAgeGroup.ageGroup} ·{" "}
              {dominantAgeGroup.total.toLocaleString()}명
            </span>
          </div>
          <div className="px-3 py-3">
            <span className="block text-[10px] text-muted-foreground">
              성별 비율
            </span>
            <span className="text-sm font-semibold text-foreground">
              남 {maleRatio}% · 여 {femaleRatio}%
            </span>
          </div>
        </div>

        <ChartContainer
          config={{
            male: { label: "남성", color: "var(--chart-1)" },
            female: { label: "여성", color: "var(--chart-2)" },
          }}
          className="h-64 w-full"
        >
          <BarChart data={chartData} layout="vertical" margin={{ right: 64 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="ageGroup"
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) =>
                    `${name}: ${Number(value).toLocaleString()}명`
                  }
                />
              }
            />
            <Bar
              dataKey="male"
              name="남성"
              fill="var(--color-male)"
              stackId="population"
              radius={[4, 0, 0, 4]}
            />
            <Bar
              dataKey="female"
              name="여성"
              fill="var(--color-female)"
              stackId="population"
              radius={[0, 4, 4, 0]}
            >
              <LabelList
                dataKey="total"
                position="right"
                className="fill-muted-foreground"
                fontSize={11}
                formatter={(value) => Number(value ?? 0).toLocaleString()}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
