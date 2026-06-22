"use client"

import { useReducer } from "react"
import { hasAnsweredQuestion } from "@/features/onboarding/lib/onboarding-form"
import type { OnboardingSurveyTransitionDirection } from "@/features/onboarding/lib/onboarding-survey-motion"
import type {
  OnboardingSurvey,
  OnboardingSurveyAnswerValue,
  OnboardingSurveyAnswers,
} from "@/features/onboarding/types/onboarding"

type SurveyNavigatorPhase = "idle" | "transitioning"

type SurveyNavigatorState = {
  activeStep: number
  isAutoAdvancing: boolean
  pendingDirection: OnboardingSurveyTransitionDirection
  phase: SurveyNavigatorPhase
}

type SurveyNavigatorAction =
  | {
      type: "BEGIN_TRANSITION"
      direction: OnboardingSurveyTransitionDirection
      isAutoAdvancing: boolean
      nextStep: number
    }
  | { type: "COMPLETE_TRANSITION" }
  | { type: "RESET" }

type UseSurveyNavigatorOptions = {
  answers: OnboardingSurveyAnswers
  setAnswer: (questionId: string, value: OnboardingSurveyAnswerValue) => void
  survey: OnboardingSurvey
}

type UseSurveyNavigatorResult = {
  canGoNext: boolean
  canGoPrev: boolean
  completeTransition: () => void
  currentAnswer: OnboardingSurveyAnswerValue | undefined
  currentQuestion: OnboardingSurvey["questions"][number]
  currentStep: number
  goNext: () => void
  goPrev: () => void
  handleAnswer: (questionId: string, value: string | string[]) => void
  isAutoAdvancing: boolean
  isLastStep: boolean
  isTransitioning: boolean
  resetNavigation: () => void
  transitionDirection: OnboardingSurveyTransitionDirection
}

const initialSurveyNavigatorState: SurveyNavigatorState = {
  activeStep: 0,
  isAutoAdvancing: false,
  pendingDirection: "forward",
  phase: "idle",
}

const surveyNavigatorReducer = (
  state: SurveyNavigatorState,
  action: SurveyNavigatorAction
): SurveyNavigatorState => {
  if (action.type === "BEGIN_TRANSITION") {
    if (state.phase !== "idle" || action.nextStep === state.activeStep) {
      return state
    }

    return {
      activeStep: action.nextStep,
      isAutoAdvancing: action.isAutoAdvancing,
      pendingDirection: action.direction,
      phase: "transitioning",
    }
  }

  if (action.type === "COMPLETE_TRANSITION") {
    if (state.phase !== "transitioning") {
      return state
    }

    return {
      ...state,
      isAutoAdvancing: false,
      phase: "idle",
    }
  }

  if (action.type === "RESET") {
    return initialSurveyNavigatorState
  }

  return state
}

export function useSurveyNavigator({
  answers,
  setAnswer,
  survey,
}: UseSurveyNavigatorOptions): UseSurveyNavigatorResult {
  const [state, dispatch] = useReducer(
    surveyNavigatorReducer,
    initialSurveyNavigatorState
  )
  const totalSteps = survey.questions.length
  const currentQuestion = survey.questions[state.activeStep]
  const currentAnswer = answers[currentQuestion.id]
  const hasAnsweredCurrentQuestion = hasAnsweredQuestion(
    currentQuestion,
    currentAnswer
  )
  const isLastStep = state.activeStep === totalSteps - 1
  const isTransitioning = state.phase !== "idle"
  const canGoPrev = state.activeStep > 0 && !isTransitioning
  const canGoNext = !isLastStep && hasAnsweredCurrentQuestion

  const beginTransition = (
    nextStep: number,
    direction: OnboardingSurveyTransitionDirection,
    isAutoAdvancing: boolean
  ) => {
    if (nextStep < 0 || nextStep >= totalSteps) {
      return
    }

    dispatch({
      type: "BEGIN_TRANSITION",
      direction,
      isAutoAdvancing,
      nextStep,
    })
  }

  const goPrev = () => {
    if (!canGoPrev) {
      return
    }

    beginTransition(state.activeStep - 1, "backward", false)
  }

  const goNext = () => {
    if (!canGoNext || isTransitioning) {
      return
    }

    beginTransition(state.activeStep + 1, "forward", false)
  }

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswer(questionId, value)

    if (
      questionId !== currentQuestion.id ||
      currentQuestion.selection_type !== "single" ||
      typeof value !== "string" ||
      isLastStep
    ) {
      return
    }

    setTimeout(() => {
      beginTransition(state.activeStep + 1, "forward", true)
    }, 150)
  }

  const completeTransition = () => {
    dispatch({ type: "COMPLETE_TRANSITION" })
  }

  const resetNavigation = () => {
    dispatch({ type: "RESET" })
  }

  return {
    canGoNext,
    canGoPrev,
    completeTransition,
    currentAnswer,
    currentQuestion,
    currentStep: state.activeStep,
    goNext,
    goPrev,
    handleAnswer,
    isAutoAdvancing: state.isAutoAdvancing,
    isLastStep,
    isTransitioning,
    resetNavigation,
    transitionDirection: state.pendingDirection,
  }
}
