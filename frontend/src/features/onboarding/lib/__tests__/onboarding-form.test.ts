import { describe, expect, it } from "vitest"
import {
  buildSaveSurveyResultRequest,
  buildSurveyPreviewRequest,
  hasAnsweredQuestion,
} from "@/features/onboarding/lib/onboarding-form"
import { onboardingSurveyFixture } from "@/features/onboarding/testing/onboarding-fixtures"

describe("onboarding-form", () => {
  it("단일 선택 문항 응답 여부를 판별한다", () => {
    const question = onboardingSurveyFixture.questions[0]

    expect(hasAnsweredQuestion(question, undefined)).toBe(false)
    expect(hasAnsweredQuestion(question, "")).toBe(false)
    expect(hasAnsweredQuestion(question, "A")).toBe(true)
  })

  it("다중 선택 문항 응답 여부를 판별한다", () => {
    const question = onboardingSurveyFixture.questions[9]

    expect(hasAnsweredQuestion(question, undefined)).toBe(false)
    expect(hasAnsweredQuestion(question, [])).toBe(false)
    expect(hasAnsweredQuestion(question, ["A"])).toBe(true)
  })

  it("설문 미리보기 요청 기본값을 채운다", () => {
    const request = buildSurveyPreviewRequest({
      answers: { q1: "A", q10: ["A", "D"] },
    })

    expect(request.profile_name).toBe("설문 결과 프로필")
  })

  it("설문 저장 요청 payload를 생성한다", () => {
    const request = buildSaveSurveyResultRequest({
      resultCode: "abc123",
    })

    expect(request).toEqual({
      result_code: "abc123",
    })
  })
})
