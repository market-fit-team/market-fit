import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"
import type { MapTab } from "@/features/map/types/map"
import type { DistrictData } from "@/features/startup/lib/data"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs"

type DetailInsightsProps = {
  activeTab: MapTab
  onTabChange: (tab: MapTab) => void
  tradeArea: DistrictData
}

export function DetailInsights({
  activeTab,
  onTabChange,
  tradeArea,
}: DetailInsightsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as MapTab)}
    >
      <TabsList variant="line" className="mb-3.5 border-b border-border pb-2">
        <TabsTrigger value="traffic">시간대 유동인구</TabsTrigger>
        <TabsTrigger value="demographics">연령분포</TabsTrigger>
        <TabsTrigger value="sectors">밀집 업종/생존율</TabsTrigger>
      </TabsList>

      <TabsContent value="traffic" className="mt-0 h-32">
        <ChartContainer
          config={{
            traffic: {
              label: "유동인구 (천명)",
              color: "var(--chart-1)",
            },
          }}
          className="h-32 w-full"
        >
          <LineChart data={tradeArea.footTrafficHourly}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={25} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="traffic"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              name="유동인구 (천명)"
            />
          </LineChart>
        </ChartContainer>
      </TabsContent>

      <TabsContent value="demographics" className="mt-0 h-32">
        <ChartContainer
          config={{
            percentage: {
              label: "비중 (%)",
              color: "var(--chart-1)",
            },
          }}
          className="h-32 w-full"
        >
          <BarChart data={tradeArea.footTrafficAge}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="ageGroup" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={25} />
            <ChartTooltip
              content={
                <ChartTooltipContent formatter={(value) => `${value}%`} />
              }
            />
            <Bar dataKey="percentage" radius={4} name="비중 (%)">
              {tradeArea.footTrafficAge.map((entry, index) => (
                <Cell
                  key={`age-${index}`}
                  fill={
                    entry.percentage > 35 ? "var(--chart-1)" : "var(--chart-2)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </TabsContent>

      <TabsContent value="sectors" className="mt-0">
        <div className="grid max-h-32 grid-cols-2 gap-3 overflow-y-auto">
          {tradeArea.topSectors.map((sector) => (
            <Card key={sector.sector} size="sm" className="bg-muted/20">
              <CardContent className="flex items-center justify-between">
                <div>
                  <span className="block font-medium text-foreground">
                    {sector.sector}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    경쟁강도: {sector.density}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-medium text-primary">
                    {sector.survivalRate}%
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    3년 생존율
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  )
}
