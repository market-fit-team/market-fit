"use client"

import { useRouter } from "next/navigation"
import { FileText } from "lucide-react"
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
import { getSelectedTradeArea } from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
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

// ResultWidget은 선택된 상권 상세 패널과 리포트 CTA를 렌더링한다.
// 이 패널의 도킹 위치는 MapView가 결정한다.
export function ResultWidget() {
  const router = useRouter()
  const activeResultTab = useMapStore((state) => state.activeResultTab)
  const selectedTradeAreaId = useMapStore((state) => state.selectedTradeAreaId)
  const setActiveResultTab = useMapStore((state) => state.setActiveResultTab)

  const selectedTradeArea = getSelectedTradeArea(selectedTradeAreaId)

  if (!selectedTradeArea) {
    return null
  }

  const handleGenerateReport = () => {
    router.push(`/report?district=${selectedTradeArea.id}`)
  }

  return (
    <Card className="mx-auto max-w-4xl gap-0 overflow-hidden py-0">
      <CardContent className="flex flex-col gap-6 py-6 md:flex-row">
        <div className="flex flex-col justify-between border-b border-border pb-6 md:w-1/3 md:border-r md:border-b-0 md:pr-6 md:pb-0">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-foreground">
                {selectedTradeArea.nameKo}
              </h3>
              <Badge variant="outline">{selectedTradeArea.nameEn}</Badge>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {selectedTradeArea.desc}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-3 text-xs">
            <div>
              <span className="block text-xs text-muted-foreground">
                월평균 매출
              </span>
              <span className="text-base font-semibold text-foreground">
                {selectedTradeArea.avgSales.toLocaleString()}만원
              </span>
              <span className="block text-xs font-medium text-primary">
                +{selectedTradeArea.yoySalesChange}% YoY
              </span>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">
                3년 생존률
              </span>
              <span className="text-base font-semibold text-foreground">
                {selectedTradeArea.survivalRate3Year}%
              </span>
              <span className="block text-xs text-muted-foreground">
                밀집도: {selectedTradeArea.densityScore}/100
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-between">
          <Tabs
            value={activeResultTab}
            onValueChange={(value) =>
              setActiveResultTab(value as typeof activeResultTab)
            }
          >
            <TabsList
              variant="line"
              className="mb-3.5 border-b border-border pb-2"
            >
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
                <LineChart data={selectedTradeArea.footTrafficHourly}>
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
                <BarChart data={selectedTradeArea.footTrafficAge}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="ageGroup" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={25} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => `${value}%`} />
                    }
                  />
                  <Bar dataKey="percentage" radius={4} name="비중 (%)">
                    {selectedTradeArea.footTrafficAge.map((entry, index) => (
                      <Cell
                        key={`age-${index}`}
                        fill={
                          entry.percentage > 35
                            ? "var(--chart-1)"
                            : "var(--chart-2)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </TabsContent>

            <TabsContent value="sectors" className="mt-0">
              <div className="grid max-h-32 grid-cols-2 gap-3 overflow-y-auto">
                {selectedTradeArea.topSectors.map((sector, index) => (
                  <Card key={index} size="sm" className="bg-muted/20">
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

          <div className="mt-3 flex justify-end border-t border-border pt-3">
            <Button
              type="button"
              size="lg"
              onClick={handleGenerateReport}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              AI 상권 리포트 생성
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
