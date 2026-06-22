"use client"

import { useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { QuestionCard } from "@/features/onboarding/components/survey/question-card"
import { SurveyProgress } from "@/features/onboarding/components/survey/survey-progress"
import { getOnboardingErrorMessage } from "@/features/onboarding/lib/onboarding-error"
import {
  buildSurveyPreviewRequest,
  hasAnsweredQuestion,
} from "@/features/onboarding/lib/onboarding-form"
import { getOnboardingResultPath } from "@/features/onboarding/lib/onboarding-routes"
import { useOnboardingStore } from "@/features/onboarding/stores/onboarding-store"
import { usePreviewActiveSurveySurveysActivePreviewPost } from "@/shared/api/generated/onboarding/endpoints/survey/survey"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"

export function OnboardingSurveyClient() {
  const router = useRouter()
  const [isRedirectPending, startRedirectTransition] = useTransition()
  const survey = useOnboardingStore((state) => state.survey)
  const answers = useOnboardingStore((state) => state.answers)
  const currentStep = useOnboardingStore((state) => state.currentStep)
  const direction = useOnboardingStore((state) => state.direction)
  const setAnswer = useOnboardingStore((state) => state.setAnswer)
  const setCurrentStep = useOnboardingStore((state) => state.setCurrentStep)
  const setDirection = useOnboardingStore((state) => state.setDirection)
  const resetSurvey = useOnboardingStore((state) => state.resetSurvey)
  const stepTransitionTimeoutRef = useRef<number | null>(null)
  const autoAdvanceTimeoutRef = useRef<number | null>(null)
  const { mutate: previewSurveyResult, isPending } =
    usePreviewActiveSurveySurveysActivePreviewPost({
      mutation: {
        onSuccess: (result) => {
          toast.success("설문 분석을 완료했습니다.")
          startRedirectTransition(() => {
            router.push(getOnboardingResultPath(result.profile.profile_code))
          })
        },
        onError: (error) => {
          toast.error(
            getOnboardingErrorMessage(
              error,
              "설문 분석 중 오류가 발생했습니다."
            )
          )
        },
      },
    })
  const isSubmitting = isPending || isRedirectPending

  useEffect(() => {
    return () => {
      if (stepTransitionTimeoutRef.current !== null) {
        window.clearTimeout(stepTransitionTimeoutRef.current)
      }

      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current)
      }
    }
  }, [])

  const totalSteps = survey.questions.length
  const currentQuestion = survey.questions[currentStep]
  const currentAnswer = answers[currentQuestion.id]
  const canAdvance = hasAnsweredQuestion(currentQuestion, currentAnswer)
  const isLastStep = currentStep === totalSteps - 1

  const moveToStep = (nextStep: number) => {
    setDirection("exit")

    if (stepTransitionTimeoutRef.current !== null) {
      window.clearTimeout(stepTransitionTimeoutRef.current)
    }

    stepTransitionTimeoutRef.current = window.setTimeout(() => {
      setCurrentStep(nextStep)
      setDirection("enter")
    }, 200)
  }

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswer(questionId, value)

    if (
      currentQuestion.selection_type === "single" &&
      typeof value === "string" &&
      currentStep < totalSteps - 1
    ) {
      if (autoAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(autoAdvanceTimeoutRef.current)
      }

      autoAdvanceTimeoutRef.current = window.setTimeout(() => {
        moveToStep(currentStep + 1)
      }, 320)
    }
  }

  const handleSubmit = () => {
    if (!canAdvance) {
      return
    }

    previewSurveyResult({
      data: buildSurveyPreviewRequest({ answers }),
    })
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-gradient-to-br from-background via-background to-accent/20">
      {isSubmitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex animate-in flex-col items-center gap-4 duration-300 fade-in zoom-in">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isPending
                ? "분석 중입니다..."
                : "결과 페이지로 이동 중입니다..."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-xl flex-col px-5 py-8 md:px-8 md:py-12">
        <header className="mb-8 space-y-3">
          <Badge variant="secondary" className="gap-1.5">
            설문 코드 {survey.survey_code} · v{survey.version}
          </Badge>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-foreground md:text-2xl">
              {survey.title}
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
              {survey.description}
            </p>
          </div>
        </header>

        <SurveyProgress current={currentStep} total={totalSteps} />

        <div className="mt-8 flex-1" style={{ minHeight: 360 }}>
          <QuestionCard
            question={currentQuestion}
            answer={currentAnswer}
            direction={direction}
            onAnswer={handleAnswer}
          />
        </div>

        <nav className="mt-8 flex items-center gap-3 border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            size="lg"
            onClick={() => moveToStep(currentStep - 1)}
            disabled={currentStep === 0 || isSubmitting}
            className="flex-1"
          >
            이전
          </Button>

          <Button
            size="lg"
            onClick={
              isLastStep ? handleSubmit : () => moveToStep(currentStep + 1)
            }
            disabled={!canAdvance || isSubmitting}
            className="flex-[2]"
          >
            {isLastStep ? "결과 보기" : "다음"}
          </Button>
        </nav>

        <div className="mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>로그인 없이도 결과를 볼 수 있습니다.</span>
          <button
            type="button"
            onClick={resetSurvey}
            className="font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            처음부터 다시
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes onboarding-fade-in-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
