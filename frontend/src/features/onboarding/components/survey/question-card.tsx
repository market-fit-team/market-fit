import type { KeyboardEvent } from "react"
import type {
  OnboardingSurveyAnswerValue,
  OnboardingSurveyQuestion,
} from "@/features/onboarding/types/onboarding"
import { Checkbox } from "@/shared/components/ui/checkbox"

type QuestionCardProps = {
  answer: OnboardingSurveyAnswerValue | undefined
  onAnswer: (questionId: string, value: string | string[]) => void
  question: OnboardingSurveyQuestion
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
  onAnswer,
  question,
}: QuestionCardProps) {
  const isSingle = question.selection_type === "single"

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
    <div className="flex h-full flex-col gap-5">
      <div className="shrink-0 space-y-2">
        <h2 className="text-lg leading-relaxed font-semibold text-foreground">
          {question.prompt}
        </h2>
        {question.selection_type === "multi" && question.max_selections ? (
          <p className="text-xs text-muted-foreground">
            최대 {question.max_selections}개까지 선택할 수 있어요
          </p>
        ) : null}
      </div>

      <div className="custom-scrollbar flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1 pb-4">
        {question.options.map((option) => {
          const isSelected = isSelectedOption(answer, option.code, isSingle)

          return (
            <div
              key={option.code}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleOptionClick(option.code)}
              onKeyDown={(event) => handleOptionKeyDown(event, option.code)}
              className={`group relative flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-200 ease-out select-none ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm"
              }`}
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
