import { describe, expect, it } from "vitest"
import {
  InvalidOnboardingProfileCodeError,
  decodeOnboardingProfileCode,
  encodeOnboardingProfileCode,
} from "@/features/onboarding/lib/onboarding-profile-code"

describe("onboarding-profile-code", () => {
  it("공유 코드는 설문 코드, 업종, 점수를 손실 없이 왕복 복원한다", () => {
    const encoded = encodeOnboardingProfileCode(
      {
        user_id: "roundtrip-user",
        profile_name: "라운드트립",
        preferred_category_code: "CS100005",
        budget_level: 0.23,
        stability_level: 0.91,
        subway_dependency_level: 0.02,
        weekend_preference_level: 0.48,
        evening_preference_level: 0.27,
        resident_focus_level: 0.88,
        worker_focus_level: 0.1,
        rent_sensitivity_level: 0.95,
        competition_tolerance_level: 0.05,
      },
      "A"
    )
    const decoded = decodeOnboardingProfileCode(encoded)

    expect(encoded).toHaveLength(16)
    expect(decoded.profileCode).toBe(encoded)
    expect(decoded.surveyCode).toBe("A")
    expect(decoded.preferredCategoryCode).toBe("CS100005")
    expect(decoded.userProfile.budget_level).toBe(0.23)
    expect(decoded.userProfile.competition_tolerance_level).toBe(0.05)
  })

  it("지원하지 않는 구버전 공유 코드는 예외를 던진다", () => {
    expect(() => decodeOnboardingProfileCode("r131A1N0K")).toThrow(
      InvalidOnboardingProfileCodeError
    )
  })

  it("형식이 잘못된 공유 코드는 예외를 던진다", () => {
    expect(() => decodeOnboardingProfileCode("invalid")).toThrow(
      InvalidOnboardingProfileCodeError
    )
  })
})
