import { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QuestionCard } from "@/features/onboarding/components/survey/question-card"
import { onboardingSurveyFixture } from "@/features/onboarding/testing/onboarding-fixtures"
import type { OnboardingSurveyAnswerValue } from "@/features/onboarding/types/onboarding"

function QuestionCardHarness({
  initialAnswer,
  questionIndex,
  onAnswer = vi.fn(),
}: {
  initialAnswer?: OnboardingSurveyAnswerValue
  onAnswer?: (value: OnboardingSurveyAnswerValue) => void
  questionIndex: number
}) {
  const question = onboardingSurveyFixture.questions[questionIndex]
  const [answer, setAnswer] = useState<OnboardingSurveyAnswerValue | undefined>(
    initialAnswer
  )

  return (
    <QuestionCard
      question={question}
      answer={answer}
      onAnswer={(_, value) => {
        setAnswer(value)
        onAnswer(value)
      }}
    />
  )
}

describe("QuestionCard", () => {
  it("단일 선택 문항에서 클릭한 선택지를 콜백에 전달한다", async () => {
    const handleAnswer = vi.fn()

    render(<QuestionCardHarness questionIndex={0} onAnswer={handleAnswer} />)

    await userEvent.click(
      screen.getByRole("button", {
        name: /점심이나 퇴근길에 들르는 직장인/,
      })
    )

    expect(handleAnswer).toHaveBeenCalledWith("B")
  })

  it("다중 선택 문항에서 최대 선택 개수를 넘기지 않는다", async () => {
    render(<QuestionCardHarness questionIndex={9} />)

    await userEvent.click(
      screen.getByRole("button", { name: /안정적인 생활 기반/ })
    )
    await userEvent.click(
      screen.getByRole("button", { name: /높은 수익과 확장 가능성/ })
    )
    await userEvent.click(
      screen.getByRole("button", { name: /자유로운 시간과 운영 방식/ })
    )
    await userEvent.click(
      screen.getByRole("button", { name: /동네에서 오래 인정받는 가게/ })
    )

    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(3)
    expect(
      screen.getByRole("button", { name: /안정적인 생활 기반/ })
    ).toHaveTextContent("안정적인 생활 기반")
    expect(
      screen.getByRole("button", { name: /동네에서 오래 인정받는 가게/ })
    ).toHaveAttribute("aria-pressed", "false")
  })
})
