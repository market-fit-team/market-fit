import {
  ONBOARDING_RECOMMENDATION_SCORE_MAX,
  ONBOARDING_RECOMMENDATION_SCORE_MIN,
  formatPopulation,
  formatSalesAmount,
  getAreaProfileBadgeVariant,
  getAreaProfileLabel,
  getRecommendationScoreTextClassName,
} from "@/features/onboarding/lib/onboarding-result"
import type { OnboardingRecommendation } from "@/features/onboarding/types/onboarding"
import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

type RecommendationCardProps = {
  delay?: number
  item: OnboardingRecommendation
}

export function RecommendationCard({
  delay = 0,
  item,
}: RecommendationCardProps) {
  const clampedScore = Math.max(
    ONBOARDING_RECOMMENDATION_SCORE_MIN,
    Math.min(ONBOARDING_RECOMMENDATION_SCORE_MAX, item.score)
  )
  const scoreBarWidth = `${Math.abs(clampedScore) * 50}%`
  const scoreBarAlignmentClassName =
    clampedScore >= 0 ? "left-1/2" : "right-1/2"
  const scoreBarColorClassName =
    clampedScore >= 0
      ? "bg-gradient-to-r from-primary/60 to-primary"
      : "bg-gradient-to-l from-orange-500/80 to-rose-500/80"

  return (
    <Card
      className="group h-full overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        animation: `onboarding-fade-in-up 0.5s ease-out ${delay}ms both`,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                item.rank <= 3
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {item.rank}
            </span>
            <div>
              <CardTitle className="text-base">{item.area_name}</CardTitle>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {item.service_category_name}
              </p>
            </div>
          </div>

          <Badge variant={getAreaProfileBadgeVariant(item.area_profile_type)}>
            {getAreaProfileLabel(item.area_profile_type)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">적합도 점수</span>
            <span
              className={`text-sm font-bold ${getRecommendationScoreTextClassName(
                item.score
              )}`}
            >
              {item.score.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>-1</span>
            <span>0</span>
            <span>1</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-background/90" />
            <div
              className={`absolute inset-y-0 ${scoreBarAlignmentClassName} ${scoreBarColorClassName} transition-all duration-700 ease-out`}
              style={{ width: scoreBarWidth }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <MetricItem
            label="예상 매출"
            value={formatSalesAmount(item.sales_amount)}
            icon={<SalesIcon />}
          />
          <MetricItem
            label="주민 인구"
            value={formatPopulation(item.resident_population)}
            icon={<ResidentIcon />}
          />
          <MetricItem
            label="직장인 인구"
            value={formatPopulation(item.worker_population)}
            icon={<WorkerIcon />}
          />
          <MetricItem
            label="주말 매출 비중"
            value={`${(item.weekend_sales_ratio * 100).toFixed(0)}%`}
            icon={<CalendarIcon />}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <ScorePill label="기회" value={item.category_opportunity_score} />
          <ScorePill label="수요격차" value={item.demand_gap_score} />
          <ScorePill
            label="트렌드"
            value={item.subway_commercial_trend_score}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-accent/50 px-3 py-2.5">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-[10px] text-muted-foreground">
          {label}
        </span>
        <span className="text-xs font-semibold text-foreground">{value}</span>
      </div>
    </div>
  )
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg border border-border/50 px-2 py-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

function SalesIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ResidentIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  )
}

function WorkerIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  )
}
