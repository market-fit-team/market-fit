"use client"

/**
 * 프로필 요약 카드 컴포넌트
 * 사용자 프로필의 주요 수치를 시각적 바 형태로 보여준다.
 */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { PROFILE_METRIC_LABELS } from "../_fixtures/response-data"
import type { UserProfile } from "../_fixtures/types"

interface ProfileSummaryProps {
  userProfile: UserProfile
  profileCode: string
}

/** 표시할 수치 목록 (worker_focus_level은 resident와 대비되므로 생략 가능) */
const DISPLAY_KEYS = [
  "stability_level",
  "resident_focus_level",
  "weekend_preference_level",
  "rent_sensitivity_level",
  "evening_preference_level",
  "budget_level",
  "subway_dependency_level",
  "competition_tolerance_level",
] as const

/** 값에 따른 바 색상 */
function barGradient(val: number): string {
  if (val >= 0.7) return "from-emerald-400/80 to-emerald-600/80"
  if (val >= 0.4) return "from-amber-400/80 to-amber-500/80"
  return "from-slate-400/60 to-slate-500/60"
}

export function ProfileSummary({
  userProfile,
  profileCode,
}: ProfileSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <span>나의 창업 성향 분석</span>
        </CardTitle>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          프로필 코드: {profileCode}
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        {DISPLAY_KEYS.map((key, idx) => {
          const val = userProfile[key as keyof UserProfile] as number
          const label = PROFILE_METRIC_LABELS[key] ?? key
          const pct = Math.round(val * 100)

          return (
            <div
              key={key}
              className="space-y-1"
              style={{
                animation: `fadeInUp 0.4s ease-out ${idx * 50}ms both`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-xs font-semibold tabular-nums">
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${barGradient(val)} transition-all duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
