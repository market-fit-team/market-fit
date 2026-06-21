"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { QuestionCard } from "./_components/QuestionCard"
import { mockQuestions, mockResult } from "./_fixtures/mockData"

export default function SurveyPage() {
  const router = useRouter()
  const [answers, setAnswers] = React.useState<Record<string, string[]>>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleAnswerChange = (questionId: string, codes: string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: codes,
    }))
  }

  // Check if all questions have at least one answer
  const isAllAnswered = mockQuestions.every(
    (q) => answers[q.id] && answers[q.id].length > 0
  )

  const handleSubmit = async () => {
    if (!isAllAnswered) return
    setIsSubmitting(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Redirect to the result page using the mock profile code
    router.push(
      `/example/two-tower-designs/design1/${mockResult.profile.profile_code}`
    )
  }

  return (
    <div className="min-h-screen bg-muted/20 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 shadow-sm backdrop-blur-md">
        <div className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-xl font-bold text-transparent">
            {mockResult.survey.title}
          </h1>
          <div className="text-sm font-medium text-muted-foreground">
            <span className={isAllAnswered ? "text-primary" : ""}>
              {Object.keys(answers).length}
            </span>{" "}
            / {mockQuestions.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div className="mb-8 space-y-2 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">
            당신의 창업 성향은?
          </h2>
          <p className="text-muted-foreground">
            10개의 질문에 답하고 나에게 맞는 상권을 추천받으세요.
          </p>
        </div>

        {mockQuestions.map((q) => (
          <div
            key={q.id}
            className="animate-in duration-500 fill-mode-both fade-in slide-in-from-bottom-4"
            style={{
              animationDelay: `${parseInt(q.id.replace("q", "")) * 100}ms`,
            }}
          >
            <QuestionCard
              id={q.id}
              prompt={q.prompt}
              options={q.options}
              selectionType={q.selection_type as "single" | "multi"}
              maxSelections={q.max_selections}
              selectedCodes={answers[q.id] || []}
              onChange={(codes) => handleAnswerChange(q.id, codes)}
            />
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="fixed right-0 bottom-0 left-0 z-20 bg-gradient-to-t from-background via-background to-transparent p-4">
        <div className="container mx-auto flex max-w-3xl justify-center">
          <Button
            size="lg"
            className="h-14 w-full rounded-full text-lg font-bold shadow-xl transition-all sm:w-2/3"
            disabled={!isAllAnswered || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                분석 중...
              </span>
            ) : (
              "결과 확인하기"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
