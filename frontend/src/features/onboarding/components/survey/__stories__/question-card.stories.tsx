import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { QuestionCard } from "@/features/onboarding/components/survey/question-card"
import { onboardingSurveyFixture } from "@/features/onboarding/testing/onboarding-fixtures"
import type { OnboardingSurveyAnswerValue } from "@/features/onboarding/types/onboarding"

function QuestionCardStoryHarness({
  initialAnswer,
  questionIndex,
}: {
  initialAnswer?: OnboardingSurveyAnswerValue
  questionIndex: number
}) {
  const question = onboardingSurveyFixture.questions[questionIndex]
  const [answer, setAnswer] = useState<OnboardingSurveyAnswerValue | undefined>(
    initialAnswer
  )

  return (
    <div className="w-full max-w-xl">
      <QuestionCard
        question={question}
        answer={answer}
        onAnswer={(_, value) => setAnswer(value)}
      />
    </div>
  )
}

const meta = {
  title: "Onboarding/Survey/QuestionCard",
  component: QuestionCardStoryHarness,
  tags: ["autodocs"],
} satisfies Meta<typeof QuestionCardStoryHarness>

export default meta

type Story = StoryObj<typeof meta>

export const SingleSelect: Story = {
  args: {
    questionIndex: 0,
  },
}

export const MultiSelect: Story = {
  args: {
    initialAnswer: ["A", "D"],
    questionIndex: 9,
  },
}
