import { AlertTriangle, ShieldCheck, Store, TrendingUp } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"
import type {
  CompetitionStats,
  IndustryCompetitionRank,
} from "@/features/map/types/map"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/shared/components/ui/chart"

type CompetitionAnalysisProps = {
  competition: CompetitionStats
}

type CompetitionInsightGroup = {
  description: string
  icon: typeof ShieldCheck
  items: IndustryCompetitionRank[]
  label: string
  tone: "default" | "danger" | "positive"
  valueKey: "closeRate" | "openRate"
}

const formatRate = (value: number) => `${value.toFixed(1)}%`
const DETAIL_CHART_COLORS = {
  dark: "var(--chart-1)",
  mid: "var(--chart-2)",
} as const

function CompetitionInsightList({
  description,
  icon: Icon,
  items,
  label,
  tone,
  valueKey,
}: CompetitionInsightGroup) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex items-start gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            tone === "danger"
              ? "bg-destructive/10 text-destructive"
              : tone === "positive"
                ? "bg-muted text-muted-foreground"
                : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 3).map((item) => (
          <span
            key={`${label}-${item.industryCode}-${item.rank}`}
            className="rounded-full border bg-card px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            <span className="font-medium text-foreground">
              {item.industryName}
            </span>{" "}
            {formatRate(item[valueKey])}
          </span>
        ))}
      </div>
    </div>
  )
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
      fill: DETAIL_CHART_COLORS.dark,
    },
    {
      name: "일반 점포",
      value: independentStoreCount,
      fill: DETAIL_CHART_COLORS.mid,
    },
  ]
  const maxStoreFlow = Math.max(
    competition.openCount,
    competition.closeCount,
    1
  )
  const netStoreChange = competition.openCount - competition.closeCount
  const insightGroups: CompetitionInsightGroup[] = [
    {
      description: "폐업 부담이 상대적으로 낮은 업종입니다.",
      icon: ShieldCheck,
      items: competition.lowClosureRateTop3,
      label: "폐업률 낮은 업종",
      tone: "positive",
      valueKey: "closeRate",
    },
    {
      description: "폐업률이 높아 진입 리스크를 확인해야 합니다.",
      icon: AlertTriangle,
      items: competition.highClosureRateTop3,
      label: "폐업률 높은 업종",
      tone: "danger",
      valueKey: "closeRate",
    },
    {
      description: "신규 점포 진입이 활발한 업종입니다.",
      icon: TrendingUp,
      items: competition.highOpenRateTop3,
      label: "개업률 높은 업종",
      tone: "default",
      valueKey: "openRate",
    },
  ]

  return (
    <section aria-labelledby="competition-analysis-title">
      <h3
        id="competition-analysis-title"
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Store className="h-4 w-4" />
        </span>
        경쟁 분석
      </h3>
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-stretch">
        <section
          aria-label="점포 구성"
          className="border-b border-border pb-5 lg:border-r lg:border-b-0 lg:pr-5 lg:pb-0"
        >
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
                      ? "h-full rounded-full bg-primary"
                      : "h-full rounded-full bg-muted-foreground"
                  }
                  style={{ width: `${(item.value / maxStoreFlow) * 100}%` }}
                />
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted px-3 py-3 text-xs">
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
      {insightGroups.some((group) => group.items.length > 0) ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {insightGroups.map((group) => (
            <CompetitionInsightList key={group.label} {...group} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
