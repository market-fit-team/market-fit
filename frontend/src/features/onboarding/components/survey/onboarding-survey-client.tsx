"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AnimatePresence,
  motion,
  useIsPresent,
  usePresenceData,
  useReducedMotion,
} from "motion/react"
import { toast } from "sonner"
import { QuestionCard } from "@/features/onboarding/components/survey/question-card"
import { SurveyProgress } from "@/features/onboarding/components/survey/survey-progress"
import { useSurveyNavigator } from "@/features/onboarding/hooks/use-survey-navigator"
import { getOnboardingErrorMessage } from "@/features/onboarding/lib/onboarding-error"
import {
  buildSurveyPreviewRequest,
  hasAnsweredQuestion,
} from "@/features/onboarding/lib/onboarding-form"
import { getOnboardingResultPath } from "@/features/onboarding/lib/onboarding-routes"
import {
  ONBOARDING_SURVEY_OVERLAY_DURATION_MS,
  type OnboardingSurveyTransitionDirection,
  buildOnboardingSurveyQuestionVariants,
  getOnboardingSurveyQuestionTransition,
} from "@/features/onboarding/lib/onboarding-survey-motion"
import { useOnboardingStore } from "@/features/onboarding/stores/onboarding-store"
import { usePreviewActiveSurveySurveysActivePreviewPost } from "@/shared/api/generated/onboarding/endpoints/survey/survey"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"

type SurveyQuestionMotionFrameProps = {
  answer: string | string[] | undefined
  direction: OnboardingSurveyTransitionDirection
  isTransitioning: boolean
  onAnswer: (questionId: string, value: string | string[]) => void
  onTransitionComplete: () => void
  question: Parameters<typeof QuestionCard>[0]["question"]
  shouldReduceMotion: boolean
}

function SurveyQuestionMotionFrame({
  answer,
  direction,
  onAnswer,
  onTransitionComplete,
  question,
  shouldReduceMotion,
}: SurveyQuestionMotionFrameProps) {
  const isPresent = useIsPresent()
  const presenceDirection =
    (usePresenceData() as OnboardingSurveyTransitionDirection | undefined) ??
    direction

  return (
    <motion.div
      key={question.id}
      custom={presenceDirection}
      initial="enter"
      animate="center"
      exit="exit"
      variants={buildOnboardingSurveyQuestionVariants(shouldReduceMotion)}
      transition={getOnboardingSurveyQuestionTransition(shouldReduceMotion)}
      onAnimationComplete={() => {
        if (!isPresent) {
          return
        }

        onTransitionComplete()
      }}
      className={!isPresent ? "pointer-events-none h-full" : "h-full"}
    >
      <QuestionCard question={question} answer={answer} onAnswer={onAnswer} />
    </motion.div>
  )
}

export function OnboardingSurveyClient() {
  const router = useRouter()
  const shouldReduceMotion = Boolean(useReducedMotion())
  const [isRedirectPending, startRedirectTransition] = useTransition()
  const survey = useOnboardingStore((state) => state.survey)
  const answers = useOnboardingStore((state) => state.answers)
  const setAnswer = useOnboardingStore((state) => state.setAnswer)
  const resetSurvey = useOnboardingStore((state) => state.resetSurvey)
  const { mutate: previewSurveyResult, isPending } =
    usePreviewActiveSurveySurveysActivePreviewPost({
      mutation: {
        onSuccess: (result) => {
          toast.success("설문 분석을 완료했습니다.")
          startRedirectTransition(() => {
            router.push(getOnboardingResultPath(result.result_code))
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
  const totalSteps = survey.questions.length
  const navigator = useSurveyNavigator({
    answers,
    setAnswer,
    survey,
  })
  const canAdvance = hasAnsweredQuestion(
    navigator.currentQuestion,
    navigator.currentAnswer
  )
  const canSubmit = canAdvance && !navigator.isTransitioning

  const handleSubmit = () => {
    if (!canSubmit) {
      return
    }

    previewSurveyResult({
      data: buildSurveyPreviewRequest({ answers }),
    })
  }

  const handleReset = () => {
    resetSurvey()
    navigator.resetNavigation()
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-linear-to-br from-background via-background to-accent/20">
      {isSubmitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className="flex animate-in flex-col items-center gap-4 fade-in zoom-in"
            style={{
              animationDuration: `${ONBOARDING_SURVEY_OVERLAY_DURATION_MS}ms`,
            }}
          >
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

      <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-xl flex-col px-5 pt-4 pb-4 md:px-8 md:pt-6 md:pb-8">
        <SurveyProgress
          current={navigator.currentStep}
          total={totalSteps}
          title={<Badge variant="secondary">창업 성향 분석</Badge>}
        />

        <div className="mt-4 flex-1 overflow-hidden">
          <AnimatePresence
            mode="wait"
            initial={false}
            custom={navigator.transitionDirection}
          >
            <SurveyQuestionMotionFrame
              key={navigator.currentQuestion.id}
              question={navigator.currentQuestion}
              answer={navigator.currentAnswer}
              direction={navigator.transitionDirection}
              isTransitioning={navigator.isTransitioning}
              shouldReduceMotion={shouldReduceMotion}
              onAnswer={navigator.handleAnswer}
              onTransitionComplete={navigator.completeTransition}
            />
          </AnimatePresence>
        </div>

        <nav className="mt-4 flex items-center gap-3 border-t border-border/50 pt-3">
          <Button
            variant="ghost"
            size="lg"
            onClick={navigator.goPrev}
            disabled={!navigator.canGoPrev || isSubmitting}
            className="flex-1"
          >
            이전
          </Button>

          <Button
            size="lg"
            onClick={navigator.isLastStep ? handleSubmit : navigator.goNext}
            disabled={
              navigator.isLastStep
                ? !canSubmit || isSubmitting
                : !navigator.canGoNext || isSubmitting
            }
            className="flex-2"
          >
            {navigator.isLastStep ? "결과 보기" : "다음"}
          </Button>
        </nav>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto font-medium underline-offset-4 hover:text-foreground hover:underline"
          >
            다시하기
          </button>
        </div>
      </div>
    </div>
  )
}
