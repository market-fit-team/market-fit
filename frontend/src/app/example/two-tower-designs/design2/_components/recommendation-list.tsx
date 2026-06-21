"use client"

import { useState } from "react"
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Coins,
  MapPin,
  Sparkles,
  TrainFront,
  TrendingUp,
  Users2,
} from "lucide-react"
import type { RecommendationItem } from "@/app/example/two-tower/_components/two-tower-types"
import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

interface RecommendationListProps {
  recommendations: RecommendationItem[]
}

/**
 * 화폐 단위 포맷팅 함수 (원화 기준, 억/만 단위 간소화)
 */
const formatKoreanCurrency = (value: number) => {
  if (value >= 100000000) {
    const eok = Math.floor(value / 100000000)
    const man = Math.round((value % 100000000) / 10000)
    return man > 0
      ? `${eok}억 ${man.toLocaleString("ko-KR")}만원`
      : `${eok}억원`
  }
  return `${Math.round(value / 10000).toLocaleString("ko-KR")}만원`
}

/**
 * 백분율 포맷팅 함수
 */
const formatPercent = (value: number) => `${Math.round(value * 100)}%`

/**
 * 매칭 점수 스케일링 함수 (2.0 ~ 4.5 원시 점수를 70 ~ 99점의 매칭율로 변환)
 */
const calculateMatchPercent = (score: number) => {
  const minScore = 2.0
  const maxScore = 4.5
  const normalized = (score - minScore) / (maxScore - minScore)
  // 최소 65점 ~ 최대 99점 사이로 예쁘게 조정
  const scorePercent = 65 + Math.round(normalized * 34)
  return Math.min(99, Math.max(65, scorePercent))
}

/**
 * 상권 추천 결과 목록 시각화 컴포넌트
 */
export function RecommendationList({
  recommendations,
}: RecommendationListProps) {
  // 아코디언처럼 접고 펼치는 상태 관리 (key: itemId, value: boolean)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {}
  )

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  if (recommendations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/40 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
        매칭된 추천 상권 데이터가 없습니다.
      </div>
    )
  }

  const topMatch = recommendations[0]
  const otherMatches = recommendations.slice(1)

  return (
    <div className="space-y-6">
      {/* 1위 상권 - 영광의 Top Match 대형 카드 */}
      <Card className="overflow-hidden border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-white/80 to-white/70 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:from-emerald-950/20 dark:via-slate-900/80 dark:to-slate-900/70">
        <CardHeader className="border-b border-emerald-500/10 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge className="animate-pulse bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700">
                <Sparkles className="mr-1 h-3 w-3 fill-current" />
                1위 최적 매칭
              </Badge>
              <Badge
                variant="outline"
                className="border-slate-300 text-[10px] text-slate-600 capitalize dark:border-slate-700 dark:text-slate-400"
              >
                {topMatch.area_profile_type} 중심 상권
              </Badge>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                매칭 적합도
              </span>
              <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {calculateMatchPercent(topMatch.score)}%
              </span>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <CardTitle className="text-2xl leading-tight font-black text-slate-800 dark:text-white">
                {topMatch.area_name}
              </CardTitle>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                선택 업종: {topMatch.service_category_name}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* 핵심 지표 그리드 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/40 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  평균 월 매출
                </p>
                <p className="mt-0.5 text-base font-black text-slate-800 dark:text-slate-100">
                  {formatKoreanCurrency(topMatch.sales_amount)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/40 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  주중 대비 주말 비중
                </p>
                <p className="mt-0.5 text-base font-black text-slate-800 dark:text-slate-100">
                  {formatPercent(topMatch.weekend_sales_ratio)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/40 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  저녁/심야 매출 비중
                </p>
                <p className="mt-0.5 text-base font-black text-slate-800 dark:text-slate-100">
                  {formatPercent(topMatch.evening_sales_ratio)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white/40 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrainFront className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                  역세권 트렌드 지표
                </p>
                <p className="mt-0.5 text-base font-black text-slate-800 dark:text-slate-100">
                  {topMatch.subway_commercial_trend_score.toFixed(2)} / 1.0
                </p>
              </div>
            </div>
          </div>

          {/* 배후 인구 정보 */}
          <div className="space-y-3 rounded-xl border border-slate-100 bg-white/20 p-4 dark:border-slate-800 dark:bg-slate-900/20">
            <div className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                배후 수요 규모
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>상주 거주 인구</span>
                  <span className="font-semibold">
                    {topMatch.resident_population.toLocaleString("ko-KR")}명
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${Math.min(100, (topMatch.resident_population / 45000) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>근무 직장 인구</span>
                  <span className="font-semibold">
                    {topMatch.worker_population.toLocaleString("ko-KR")}명
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${Math.min(100, (topMatch.worker_population / 150000) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2~5위 상권 리스트 (접이식 아코디언 리스트) */}
      <div className="space-y-3">
        <h3 className="pl-1 text-sm font-bold text-slate-600 dark:text-slate-400">
          그 외 매칭 상권 리스트 (2~5위)
        </h3>

        {otherMatches.map((item) => {
          const isExpanded = !!expandedItems[item.item_id]
          const matchPercent = calculateMatchPercent(item.score)

          return (
            <Card
              key={item.item_id}
              className={`overflow-hidden border-0 bg-white/60 shadow-md backdrop-blur-md transition-all duration-200 dark:bg-slate-900/60 ${
                isExpanded ? "ring-1 ring-emerald-500/20" : ""
              }`}
            >
              {/* 카드 헤더(클릭 시 확장 토글) */}
              <button
                onClick={() => toggleExpand(item.item_id)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 font-mono text-xs font-black text-white dark:bg-slate-700">
                    {item.rank}
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                      {item.area_name}
                      <Badge
                        variant="outline"
                        className="border-slate-200 px-1.5 py-0 text-[9px] text-slate-500 uppercase dark:border-slate-800"
                      >
                        {item.area_profile_type}
                      </Badge>
                    </h4>
                    <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                      예상 월 매출: {formatKoreanCurrency(item.sales_amount)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                      적합도
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
                      {matchPercent}%
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* 접이식 상세 지표 영역 */}
              {isExpanded && (
                <div className="animate-in space-y-4 border-t border-slate-100 bg-slate-50/30 p-4 duration-200 slide-in-from-top-1 dark:border-slate-800/80 dark:bg-slate-900/10">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-100 bg-white/40 p-3 text-center dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        주말 매출
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">
                        {formatPercent(item.weekend_sales_ratio)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-white/40 p-3 text-center dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        저녁 매출
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-800 dark:text-slate-200">
                        {formatPercent(item.evening_sales_ratio)}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-white/40 p-3 text-center dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="text-[9px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                        역세권 지표
                      </p>
                      <p className="mt-1 font-mono text-sm font-black text-slate-800 dark:text-slate-200">
                        {item.subway_commercial_trend_score.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center justify-between rounded border border-slate-100/50 bg-white/20 p-2 dark:border-slate-800/50 dark:bg-slate-900/20">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        상주 거주 인구
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {item.resident_population.toLocaleString("ko-KR")}명
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded border border-slate-100/50 bg-white/20 p-2 dark:border-slate-800/50 dark:bg-slate-900/20">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Users2 className="h-3 w-3 text-slate-400" />
                        근무 직장 인구
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {item.worker_population.toLocaleString("ko-KR")}명
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
