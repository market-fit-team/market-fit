import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useSurveyNavigator } from "@/features/onboarding/hooks/use-survey-navigator"
import { onboardingSurveyFixture } from "@/features/onboarding/testing/onboarding-fixtures"
import type {
  OnboardingSurvey,
  OnboardingSurveyAnswers,
} from "@/features/onboarding/types/onboarding"

const onboardingSurveyTestFixture: OnboardingSurvey = {
  ...onboardingSurveyFixture,
  question_count: 2,
  questions: [
    onboardingSurveyFixture.questions[0],
    onboardingSurveyFixture.questions[9],
  ],
}

describe("useSurveyNavigator", () => {
  it("초기 진입 시 첫 질문과 버튼 상태를 올바르게 계산한다", () => {
    const setAnswer = vi.fn()
    const { result } = renderHook(() =>
      useSurveyNavigator({
        answers: {},
        setAnswer,
        survey: onboardingSurveyTestFixture,
      })
    )

    expect(result.current.currentStep).toBe(0)
    expect(result.current.currentQuestion.id).toBe("q1")
    expect(result.current.canGoPrev).toBe(false)
    expect(result.current.canGoNext).toBe(false)
    expect(result.current.isLastStep).toBe(false)
  })

  it("단일 선택 문항에 응답하면 자동으로 다음 질문으로 전환한다", () => {
    let answers: OnboardingSurveyAnswers = {}
    const setAnswer = vi.fn((questionId: string, value: string | string[]) => {
      answers = {
        ...answers,
        [questionId]: value,
      }
    })
    const { result, rerender } = renderHook(() =>
      useSurveyNavigator({
        answers,
        setAnswer,
        survey: onboardingSurveyTestFixture,
      })
    )

    act(() => {
      result.current.handleAnswer("q1", "B")
    })
    rerender()

    expect(result.current.currentStep).toBe(1)
    expect(result.current.currentQuestion.id).toBe("q10")
    expect(result.current.isTransitioning).toBe(true)
    expect(result.current.isAutoAdvancing).toBe(true)

    act(() => {
      result.current.completeTransition()
    })

    expect(result.current.isTransitioning).toBe(false)
    expect(result.current.isAutoAdvancing).toBe(false)
  })

  it("이미 답한 단일 선택 문항으로 돌아오면 다음 버튼 이동이 가능하다", () => {
    let answers: OnboardingSurveyAnswers = {}
    const setAnswer = vi.fn((questionId: string, value: string | string[]) => {
      answers = {
        ...answers,
        [questionId]: value,
      }
    })
    const { result, rerender } = renderHook(() =>
      useSurveyNavigator({
        answers,
        setAnswer,
        survey: onboardingSurveyTestFixture,
      })
    )

    act(() => {
      result.current.handleAnswer("q1", "B")
    })
    rerender()

    act(() => {
      result.current.completeTransition()
    })

    act(() => {
      result.current.goPrev()
    })
    rerender()

    expect(result.current.currentStep).toBe(0)
    expect(result.current.isTransitioning).toBe(true)
    expect(result.current.canGoNext).toBe(true)

    act(() => {
      result.current.completeTransition()
    })

    expect(result.current.currentStep).toBe(0)
    expect(result.current.canGoNext).toBe(true)
  })

  it("다중 선택 문항에서는 자동 이동하지 않는다", () => {
    let answers: OnboardingSurveyAnswers = {
      q1: "A",
    }
    const setAnswer = vi.fn((questionId: string, value: string | string[]) => {
      answers = {
        ...answers,
        [questionId]: value,
      }
    })
    const { result, rerender } = renderHook(() =>
      useSurveyNavigator({
        answers,
        setAnswer,
        survey: onboardingSurveyTestFixture,
      })
    )

    act(() => {
      result.current.handleAnswer("q1", "A")
    })
    rerender()

    act(() => {
      result.current.completeTransition()
    })

    act(() => {
      result.current.handleAnswer("q10", ["A", "D"])
    })
    rerender()

    expect(result.current.currentStep).toBe(1)
    expect(result.current.isTransitioning).toBe(false)
    expect(result.current.isLastStep).toBe(true)
    expect(result.current.canGoNext).toBe(false)
  })

  it("리셋하면 질문과 전이 상태를 처음으로 되돌린다", () => {
    let answers: OnboardingSurveyAnswers = {}
    const setAnswer = vi.fn((questionId: string, value: string | string[]) => {
      answers = {
        ...answers,
        [questionId]: value,
      }
    })
    const { result, rerender } = renderHook(() =>
      useSurveyNavigator({
        answers,
        setAnswer,
        survey: onboardingSurveyTestFixture,
      })
    )

    act(() => {
      result.current.handleAnswer("q1", "C")
    })
    rerender()

    expect(result.current.currentStep).toBe(1)

    act(() => {
      result.current.resetNavigation()
    })

    expect(result.current.currentStep).toBe(0)
    expect(result.current.currentQuestion.id).toBe("q1")
    expect(result.current.isTransitioning).toBe(false)
  })

  it("전이 중에는 이전과 다음 요청을 무시한다", () => {
    let answers: OnboardingSurveyAnswers = {}
    const setAnswer = vi.fn((questionId: string, value: string | string[]) => {
      answers = {
        ...answers,
        [questionId]: value,
      }
    })
    const { result, rerender } = renderHook(() =>
      useSurveyNavigator({
        answers,
        setAnswer,
        survey: onboardingSurveyTestFixture,
      })
    )

    act(() => {
      result.current.handleAnswer("q1", "D")
    })
    rerender()

    act(() => {
      result.current.goPrev()
      result.current.goNext()
    })

    expect(result.current.currentStep).toBe(1)
    expect(result.current.isTransitioning).toBe(true)
  })
})
