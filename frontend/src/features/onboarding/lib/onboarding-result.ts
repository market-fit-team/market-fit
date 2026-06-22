import { ONBOARDING_ENTRY_PATH } from "@/features/onboarding/lib/onboarding-routes"
import type { OnboardingUserProfile } from "@/features/onboarding/types/onboarding"

export type OnboardingMetricKey =
  | "stability_level"
  | "resident_focus_level"
  | "weekend_preference_level"
  | "rent_sensitivity_level"
  | "evening_preference_level"
  | "competition_tolerance_level"
  | "budget_level"
  | "subway_dependency_level"

export const ONBOARDING_RADAR_METRICS: Array<{
  key: OnboardingMetricKey
  label: string
}> = [
  { key: "stability_level", label: "안정성" },
  { key: "resident_focus_level", label: "주민 집중" },
  { key: "weekend_preference_level", label: "주말 선호" },
  { key: "rent_sensitivity_level", label: "임대 민감" },
  { key: "evening_preference_level", label: "저녁 선호" },
  { key: "competition_tolerance_level", label: "경쟁 수용" },
  { key: "budget_level", label: "예산" },
  { key: "subway_dependency_level", label: "역세권" },
]

export const ONBOARDING_PROFILE_METRIC_KEYS: OnboardingMetricKey[] = [
  "stability_level",
  "resident_focus_level",
  "weekend_preference_level",
  "rent_sensitivity_level",
  "evening_preference_level",
  "budget_level",
  "subway_dependency_level",
  "competition_tolerance_level",
]

export const ONBOARDING_RECOMMENDATION_SCORE_MIN = 0
export const ONBOARDING_RECOMMENDATION_SCORE_MAX = 1

const AREA_PROFILE_LABELS: Record<string, string> = {
  commercial: "상업형",
  mixed: "혼합형",
  office: "오피스형",
  residential: "주거형",
}

const PROFILE_METRIC_LABELS: Record<OnboardingMetricKey, string> = {
  budget_level: "예산 수준",
  competition_tolerance_level: "경쟁 수용",
  evening_preference_level: "저녁 선호",
  rent_sensitivity_level: "임대료 민감",
  resident_focus_level: "주민 집중",
  stability_level: "안정 추구",
  subway_dependency_level: "지하철 의존",
  weekend_preference_level: "주말 선호",
}

export const getOnboardingEntryPath = () => ONBOARDING_ENTRY_PATH

export const getAreaProfileLabel = (areaProfileType: string) => {
  return AREA_PROFILE_LABELS[areaProfileType] ?? areaProfileType
}

export const getAreaProfileBadgeVariant = (
  areaProfileType: string
): "default" | "secondary" | "outline" => {
  switch (areaProfileType) {
    case "residential":
      return "default"
    case "office":
      return "secondary"
    default:
      return "outline"
  }
}

export const getProfileMetricLabel = (metricKey: OnboardingMetricKey) => {
  return PROFILE_METRIC_LABELS[metricKey]
}

export const getMetricBarClassName = (value: number) => {
  if (value >= 0.7) {
    return "bg-emerald-500/70"
  }

  if (value >= 0.4) {
    return "bg-amber-500/70"
  }

  return "bg-muted-foreground/40"
}

export const getRecommendationScoreTextClassName = (score: number) => {
  if (score >= 0.7) {
    return "text-emerald-600 dark:text-emerald-400"
  }

  if (score >= 0.4) {
    return "text-amber-600 dark:text-amber-400"
  }

  return "text-orange-600 dark:text-orange-400"
}

export const formatSalesAmount = (amount: number) => {
  const eok = amount / 100_000_000

  if (eok >= 1) {
    return `${eok.toFixed(1)}억`
  }

  return `${(amount / 10_000).toFixed(0)}만`
}

export const formatPopulation = (population: number) => {
  if (population >= 10_000) {
    return `${(population / 10_000).toFixed(1)}만`
  }

  return population.toLocaleString()
}

export const buildOnboardingInsights = (profile: OnboardingUserProfile) => {
  return [
    {
      tone: profile.stability_level >= 0.7 ? "positive" : "warning",
      text:
        profile.stability_level >= 0.7
          ? "안정적인 운영을 선호하며, 꾸준한 매출 흐름이 중요합니다."
          : "성장 잠재력을 중시하며, 도전적인 상권도 고려하는 편입니다.",
    },
    {
      tone: profile.resident_focus_level >= 0.7 ? "positive" : "warning",
      text:
        profile.resident_focus_level >= 0.7
          ? "동네 주민 기반의 안정적인 고객층이 잘 맞습니다."
          : "유동 인구와 다양한 방문 고객을 함께 기대하는 성향입니다.",
    },
    {
      tone: profile.rent_sensitivity_level >= 0.7 ? "positive" : "warning",
      text:
        profile.rent_sensitivity_level >= 0.7
          ? "임대료 부담을 줄이는 전략이 운영 안정성에 더 잘 맞습니다."
          : "입지 투자에 적극적인 편이라 프리미엄 상권도 검토할 수 있습니다.",
    },
  ] as const
}
