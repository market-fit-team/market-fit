"use client"

/**
 * 추천 상권 카드 컴포넌트
 * 순위, 점수, 상권명, 매출, 인구 데이터 등을 카드 형태로 표시한다.
 */
import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { AREA_PROFILE_LABELS } from "../_fixtures/response-data"
import type { Recommendation } from "../_fixtures/types"

interface RecommendationCardProps {
  item: Recommendation
  /** 등장 애니메이션 딜레이 (ms) */
  delay?: number
}

/** 매출 금액을 억 단위로 포맷 */
function formatSales(amount: number): string {
  const eok = amount / 100_000_000
  return eok >= 1 ? `${eok.toFixed(1)}억` : `${(amount / 10_000).toFixed(0)}만`
}

/** 인구 수를 천 단위로 포맷 */
function formatPopulation(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString()
}

/** 점수 → 색상 (그라데이션 활용) */
function scoreColor(score: number): string {
  if (score >= 3.0) return "text-emerald-500"
  if (score >= 2.5) return "text-amber-500"
  return "text-orange-500"
}

/** 순위별 메달 이모지 */
function rankEmoji(rank: number): string {
  if (rank === 1) return "🥇"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return `${rank}`
}

/** 상권 유형별 배지 variant */
function profileVariant(type: string): "default" | "secondary" | "outline" {
  switch (type) {
    case "residential":
      return "default"
    case "office":
      return "secondary"
    default:
      return "outline"
  }
}

export function RecommendationCard({
  item,
  delay = 0,
}: RecommendationCardProps) {
  const profileLabel =
    AREA_PROFILE_LABELS[item.area_profile_type] ?? item.area_profile_type

  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        animation: `fadeInUp 0.5s ease-out ${delay}ms both`,
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label={`${item.rank}위`}>
              {rankEmoji(item.rank)}
            </span>
            <CardTitle className="text-base">{item.area_name}</CardTitle>
          </div>
          <Badge variant={profileVariant(item.area_profile_type)}>
            {profileLabel}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.service_category_name}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 적합도 점수 바 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">적합도 점수</span>
            <span className={`text-sm font-bold ${scoreColor(item.score)}`}>
              {item.score.toFixed(2)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-700 ease-out"
              style={{ width: `${Math.min((item.score / 4) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* 상세 지표 그리드 */}
        <div className="grid grid-cols-2 gap-3">
          <MetricItem
            label="예상 매출"
            value={formatSales(item.sales_amount)}
            icon="💰"
          />
          <MetricItem
            label="주민 인구"
            value={formatPopulation(item.resident_population)}
            icon="🏠"
          />
          <MetricItem
            label="직장인 인구"
            value={formatPopulation(item.worker_population)}
            icon="💼"
          />
          <MetricItem
            label="주말 매출 비중"
            value={`${(item.weekend_sales_ratio * 100).toFixed(0)}%`}
            icon="📅"
          />
        </div>

        {/* 하단 기회/수요 점수 */}
        <div className="flex gap-2 pt-1">
          <ScorePill label="기회점수" value={item.category_opportunity_score} />
          <ScorePill label="수요격차" value={item.demand_gap_score} />
          <ScorePill
            label="상권트렌드"
            value={item.subway_commercial_trend_score}
          />
        </div>
      </CardContent>
    </Card>
  )
}

/** 지표 항목 (아이콘 + 라벨 + 값) */
function MetricItem({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
      <span className="text-sm" role="img" aria-label={label}>
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-xs font-semibold text-foreground">{value}</span>
      </div>
    </div>
  )
}

/** 작은 점수 알약 */
function ScorePill({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg border border-border/50 px-2 py-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-bold text-foreground">{pct}%</span>
    </div>
  )
}
