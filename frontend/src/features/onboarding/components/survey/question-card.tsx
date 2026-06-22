import type { KeyboardEvent } from "react"
import type {
  OnboardingSurveyAnswerValue,
  OnboardingSurveyQuestion,
} from "@/features/onboarding/types/onboarding"
import { Checkbox } from "@/shared/components/ui/checkbox"

type QuestionCardProps = {
  answer: OnboardingSurveyAnswerValue | undefined
  direction: "enter" | "exit" | "idle"
  onAnswer: (questionId: string, value: string | string[]) => void
  question: OnboardingSurveyQuestion
}

const getAnimationClassName = (direction: QuestionCardProps["direction"]) => {
  if (direction === "enter") {
    return "animate-in fade-in slide-in-from-right-8 duration-400"
  }

  if (direction === "exit") {
    return "animate-out fade-out slide-out-to-left-8 duration-300"
  }

  return ""
}

const isSelectedOption = (
  answer: OnboardingSurveyAnswerValue | undefined,
  optionCode: string,
  isSingle: boolean
) => {
  if (isSingle) {
    return answer === optionCode
  }

  return Array.isArray(answer) && answer.includes(optionCode)
}

export function QuestionCard({
  answer,
  direction,
  onAnswer,
  question,
}: QuestionCardProps) {
  const isSingle = question.selection_type === "single"
  const animationClassName = getAnimationClassName(direction)

  const handleOptionClick = (optionCode: string) => {
    if (isSingle) {
      onAnswer(question.id, optionCode)
      return
    }

    const currentSelections = Array.isArray(answer) ? answer : []
    const maxSelections = question.max_selections ?? Number.POSITIVE_INFINITY

    if (currentSelections.includes(optionCode)) {
      onAnswer(
        question.id,
        currentSelections.filter((selection) => selection !== optionCode)
      )
      return
    }

    if (currentSelections.length < maxSelections) {
      onAnswer(question.id, [...currentSelections, optionCode])
    }
  }

  const handleOptionKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    optionCode: string
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    handleOptionClick(optionCode)
  }

  return (
    <div className={`flex flex-col gap-6 ${animationClassName}`}>
      <div className="space-y-2" style={{ minHeight: 48 }}>
        <h2 className="text-lg leading-relaxed font-semibold text-foreground">
          {question.prompt}
        </h2>
        {question.selection_type === "multi" && question.max_selections ? (
          <p className="text-xs text-muted-foreground">
            최대 {question.max_selections}개까지 선택할 수 있어요
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3" style={{ minHeight: 220 }}>
        {question.options.map((option, index) => {
          const isSelected = isSelectedOption(answer, option.code, isSingle)

          return (
            <div
              key={option.code}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleOptionClick(option.code)}
              onKeyDown={(event) => handleOptionKeyDown(event, option.code)}
              className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all duration-200 ease-out ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm"
              }`}
              style={{
                animationDelay: `${index * 60}ms`,
                animation:
                  direction === "enter"
                    ? `onboarding-fade-in-up 0.4s ease-out ${index * 60}ms both`
                    : undefined,
              }}
            >
              {isSingle ? (
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                    isSelected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30 group-hover:border-primary/50"
                  }`}
                >
                  {isSelected ? (
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  ) : null}
                </div>
              ) : (
                <Checkbox
                  checked={isSelected}
                  className="pointer-events-none"
                  aria-hidden
                  tabIndex={-1}
                />
              )}

              <span
                className={`flex-1 transition-colors duration-200 ${
                  isSelected
                    ? "font-medium text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {option.label}
              </span>

              {isSelected ? (
                <svg
                  className="h-4 w-4 shrink-0 animate-in text-primary duration-200 zoom-in"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
