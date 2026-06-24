import { Store } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"
import type { CompetitionStats } from "@/features/map/types/map"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"

type CompetitionAnalysisProps = {
  competition: CompetitionStats
}

export function CompetitionAnalysisSection({
  competition,
}: CompetitionAnalysisProps) {
  const independentStoreCount = Math.max(
    competition.storeCount - competition.franchiseStoreCount,
    0
  )
  const storeComposition = [
    {
      name: "프랜차이즈",
      value: competition.franchiseStoreCount,
      fill: "var(--chart-4)",
    },
    {
      name: "일반 점포",
      value: independentStoreCount,
      fill: "var(--chart-1)",
    },
  ]
  const maxStoreFlow = Math.max(
    competition.openCount,
    competition.closeCount,
    1
  )
  const netStoreChange = competition.openCount - competition.closeCount

  return (
    <section aria-labelledby="competition-analysis-title">
      <h3
        id="competition-analysis-title"
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <Store className="h-4 w-4 text-primary" />
        경쟁 분석
      </h3>
      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:items-center">
        <section aria-label="점포 구성">
          <div className="relative">
            <ChartContainer
              config={{ value: { label: "점포 수" } }}
              className="mx-auto h-52 w-full max-w-sm"
            >
              <PieChart>
                <Pie
                  data={storeComposition}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {storeComposition.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value, name) =>
                        `${name}: ${Number(value).toLocaleString()}개`
                      }
                    />
                  }
                />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted-foreground">
                전체 점포
              </span>
              <span className="text-xl font-semibold text-foreground">
                {competition.storeCount.toLocaleString()}개
              </span>
            </div>
          </div>
          <div className="mx-auto flex max-w-sm items-center justify-center gap-5 text-xs text-muted-foreground">
            {storeComposition.map((item) => (
              <span key={item.name} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: item.fill }}
                />
                {item.name} {item.value.toLocaleString()}개
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-5" aria-label="개업 및 폐업 비교">
          <div>
            <p className="text-xs font-medium text-foreground">개·폐업 흐름</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              동일 기간의 신규 개업과 폐업 점포를 비교합니다.
            </p>
          </div>

          {[
            { label: "개업", value: competition.openCount },
            { label: "폐업", value: competition.closeCount },
          ].map((item, index) => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">
                  {item.value.toLocaleString()}개
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={
                    index === 0
                      ? "h-full rounded-full bg-foreground"
                      : "h-full rounded-full bg-muted-foreground"
                  }
                  style={{ width: `${(item.value / maxStoreFlow) * 100}%` }}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-3 text-xs">
            <div>
              <span className="block text-muted-foreground">점포 순증감</span>
              <span className="text-[10px] text-muted-foreground">
                개업 수 - 폐업 수
              </span>
            </div>
            <span
              className={
                netStoreChange >= 0
                  ? "text-lg font-semibold text-foreground"
                  : "text-lg font-semibold text-destructive"
              }
            >
              {netStoreChange >= 0 ? "+" : ""}
              {netStoreChange}개
            </span>
          </div>
        </section>
      </div>
    </section>
  )
}
