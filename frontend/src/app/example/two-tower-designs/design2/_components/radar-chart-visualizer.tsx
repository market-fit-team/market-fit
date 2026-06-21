"use client"

import { useEffect, useState } from "react"
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { UserProfile } from "@/app/example/two-tower/_components/two-tower-types"
import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

interface RadarChartVisualizerProps {
  userProfile: UserProfile
}

interface MetricDetail {
  key: keyof Omit<
    UserProfile,
    "user_id" | "profile_name" | "preferred_category_code"
  >
  label: string
  description: string
}

/**
 * 9대 창업 성향 지표 한글 라벨 및 세부 설명 정의
 */
const METRIC_DETAILS: MetricDetail[] = [
  {
    key: "stability_level",
    label: "매출 안정성",
    description:
      "위험을 최소화하고 매월 꾸준히 유지되는 수익을 중시하는 성향입니다.",
  },
  {
    key: "competition_tolerance_level",
    label: "경쟁 수용도",
    description:
      "치열한 경쟁 상권이라도 대형 수요와 트렌드를 공략하고자 하는 의지입니다.",
  },
  {
    key: "subway_dependency_level",
    label: "역세권 의존",
    description:
      "유동인구가 보장되는 지하철역 인근 초밀착 자리를 선호하는 수준입니다.",
  },
  {
    key: "rent_sensitivity_level",
    label: "임대료 민감도",
    description:
      "고정 월세와 임대료 부담을 최대한 낮추고 보수적으로 시작하려는 경향입니다.",
  },
  {
    key: "budget_level",
    label: "소자본 최적화",
    description:
      "초기 투자 예산 규모를 소액으로 타이트하게 관리하여 창업하려는 성향입니다.",
  },
  {
    key: "weekend_preference_level",
    label: "주말 상권 선호",
    description:
      "주중보다는 주말과 휴일의 나들이 특수 및 가족/연인 타겟 수요를 노립니다.",
  },
  {
    key: "evening_preference_level",
    label: "저녁 상권 선호",
    description:
      "낮보다는 저녁과 심야 시간대의 직장인 및 유흥 배후 소비를 집중 공략합니다.",
  },
  {
    key: "resident_focus_level",
    label: "배후 주거 선호",
    description:
      "아파트, 빌라 등 주택 밀집 구역의 동네 단골 주민들을 집중 타겟팅합니다.",
  },
  {
    key: "worker_focus_level",
    label: "배후 오피스 선호",
    description:
      "지식산업센터나 기업체 근무 직장인들의 점심/퇴근길 수요를 집중 타겟팅합니다.",
  },
]

/**
 * Recharts 레이더 차트를 활용한 유저 성향 시각화 컴포넌트
 */
export function RadarChartVisualizer({
  userProfile,
}: RadarChartVisualizerProps) {
  // SSR Hydration 에러 방지를 위해 컴포넌트 마운트 여부 관리
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <Card className="flex h-[450px] items-center justify-center border-0 bg-white/70 shadow-xl backdrop-blur-xl dark:bg-slate-900/70">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <span className="text-sm text-slate-500 dark:text-slate-400">
            성향 분석 차트 로딩 중...
          </span>
        </div>
      </Card>
    )
  }

  // 레이더 차트 입력을 위한 데이터셋 파싱
  const chartData = METRIC_DETAILS.map((metric) => ({
    subject: metric.label,
    value: Math.round((userProfile[metric.key] ?? 0.5) * 100),
    fullMark: 100,
  }))

  return (
    <Card className="overflow-hidden border-0 bg-white/70 shadow-xl backdrop-blur-xl transition-all duration-300 dark:bg-slate-900/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">
          성향 프로필 분석
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          설문 응답 가중치에 의해 산출된 9대 창업 성향 분석 다이어그램입니다.
          (100점 만점 기준)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 레이더 차트 영역 */}
        <div className="flex h-[280px] w-full items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
              <PolarGrid stroke="#cbd5e1" className="dark:stroke-slate-800" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
              />
              <Radar
                name="내 성향 점수"
                dataKey="value"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.25}
                activeDot={{ r: 6 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {payload[0].name}
                        </p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {payload[0].value}점
                        </p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 지표 상세 가이드 그리드 리스트 */}
        <div className="grid gap-3 border-t border-slate-100 pt-2 sm:grid-cols-2 lg:grid-cols-3 dark:border-slate-800/80">
          {METRIC_DETAILS.map((metric) => {
            const score = Math.round((userProfile[metric.key] ?? 0.5) * 100)
            return (
              <div
                key={metric.key}
                className="space-y-1.5 rounded-xl border border-slate-100 bg-white/40 p-3 transition-all hover:shadow-sm dark:border-slate-800/60 dark:bg-slate-950/20"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {metric.label}
                  </span>
                  <Badge
                    variant={
                      score >= 70
                        ? "default"
                        : score >= 40
                          ? "secondary"
                          : "outline"
                    }
                    className={`font-mono text-[10px] font-bold ${
                      score >= 70
                        ? "border-0 bg-emerald-500 text-white hover:bg-emerald-600"
                        : "border-0 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {score}점
                  </Badge>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {metric.description}
                </p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
