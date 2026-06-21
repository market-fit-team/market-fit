"use client"

import React from "react"
import type { UserProfile } from "../_fixtures/result"

/** 사용자 프로필 파라미터 레이블 매핑 */
const PROFILE_LABELS: Record<
  keyof Omit<
    UserProfile,
    "user_id" | "profile_name" | "preferred_category_code"
  >,
  string
> = {
  budget_level: "예산 수준",
  stability_level: "안정 추구",
  subway_dependency_level: "역세권 의존",
  weekend_preference_level: "주말 선호",
  evening_preference_level: "저녁 선호",
  resident_focus_level: "주거 상권 선호",
  worker_focus_level: "오피스 상권 선호",
  rent_sensitivity_level: "임대료 민감도",
  competition_tolerance_level: "경쟁 내성",
}

/** 파라미터 값에 따른 색상 반환 */
function getBarColor(value: number): string {
  if (value >= 0.7) return "var(--d5-accent-primary)"
  if (value >= 0.4) return "var(--d5-accent-secondary)"
  return "var(--d5-accent-tertiary)"
}

interface ProfileChartProps {
  /** 사용자 프로필 파라미터 */
  profile: UserProfile
}

/**
 * 사용자 성향 파라미터 시각화 컴포넌트
 * 각 지표를 수평 바 차트로 표시한다
 */
export function ProfileChart({ profile }: ProfileChartProps) {
  const entries = Object.entries(PROFILE_LABELS) as [
    keyof typeof PROFILE_LABELS,
    string,
  ][]

  return (
    <div className="d5-profile-chart">
      <h3 className="d5-section-title">📊 나의 창업 성향 프로필</h3>
      <div className="d5-bars-container">
        {entries.map(([key, label]) => {
          const value = profile[key] as number
          const percent = Math.round(value * 100)
          return (
            <div key={key} className="d5-bar-row">
              <div className="d5-bar-label-row">
                <span className="d5-bar-label">{label}</span>
                <span className="d5-bar-value">{percent}%</span>
              </div>
              <div className="d5-bar-track">
                <div
                  className="d5-bar-fill"
                  style={{
                    width: `${percent}%`,
                    background: getBarColor(value),
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
