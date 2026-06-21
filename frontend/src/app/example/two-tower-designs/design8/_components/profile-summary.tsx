"use client"

/**
 * 프로필 수치 바 차트 컴포넌트
 * 사용자의 창업 성향 8가지 수치를 바 형태로 시각화한다.
 * 이모지 대신 텍스트와 색상으로 정보를 전달한다.
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

/** 표시할 수치 목록 */
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
function barColor(val: number): string {
  if (val >= 0.7) return "bg-emerald-500/70"
  if (val >= 0.4) return "bg-amber-500/70"
  return "bg-muted-foreground/40"
}

export function ProfileSummary({
  userProfile,
  profileCode,
}: ProfileSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          나의 창업 성향 분석
        </CardTitle>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          프로필 코드: {profileCode}
        </p>
      </CardHeader>

      <CardContent>
        {/* 고정 높이로 레이아웃 시프트 방지 */}
        <div className="space-y-3" style={{ minHeight: 300 }}>
          {DISPLAY_KEYS.map((key, idx) => {
            const val = userProfile[key as keyof UserProfile] as number
            const label = PROFILE_METRIC_LABELS[key] ?? key
            const pct = Math.round(val * 100)

            return (
              <div
                key={key}
                className="space-y-1"
                style={{
                  animation: `d8-fadeInUp 0.4s ease-out ${idx * 50}ms both`,
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
                    className={`h-full rounded-full ${barColor(val)} transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
