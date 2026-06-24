import { describe, expect, it } from "vitest"
import {
  buildOnboardingInsights,
  formatPopulation,
  formatSalesAmount,
  getAreaProfileLabel,
} from "@/features/onboarding/lib/onboarding-result"
import { onboardingResultFixture } from "@/features/onboarding/testing/onboarding-fixtures"

describe("onboarding-result", () => {
  it("매출 금액을 억 또는 만 단위로 포맷한다", () => {
    expect(formatSalesAmount(1950000000)).toBe("19.5억")
    expect(formatSalesAmount(8500000)).toBe("850만")
  })

  it("인구 수를 만 단위로 포맷한다", () => {
    expect(formatPopulation(23110)).toBe("2.3만")
    expect(formatPopulation(8900)).toBe("8,900")
  })

  it("상권 유형 라벨을 반환한다", () => {
    expect(getAreaProfileLabel("office")).toBe("오피스형")
    expect(getAreaProfileLabel("unknown")).toBe("unknown")
  })

  it("프로필 기반 인사이트 문장을 생성한다", () => {
    const insights = buildOnboardingInsights(
      onboardingResultFixture.area_user_profile
    )

    expect(insights).toHaveLength(3)
    expect(insights[0]?.text).toMatch(/안정적인 운영/)
  })
})
