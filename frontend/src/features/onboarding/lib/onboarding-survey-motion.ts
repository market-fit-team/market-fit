import type { Transition, Variants } from "motion/react"

export type OnboardingSurveyTransitionDirection = "forward" | "backward"

const SURVEY_ENTER_EASE = [0.12, 0, 0.39, 0] as const
const SURVEY_EXIT_EASE = [0.4, 0, 1, 1] as const

export const ONBOARDING_SURVEY_OVERLAY_DURATION_MS = 240
export const ONBOARDING_SURVEY_PROGRESS_DURATION_MS = 240

export const buildOnboardingSurveyQuestionVariants = (
  shouldReduceMotion: boolean
): Variants => {
  const distance = shouldReduceMotion ? 0 : 22

  return {
    enter: () => ({
      opacity: 0,
      x: 0,
    }),
    center: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0.14 : 0.3,
        ease: SURVEY_ENTER_EASE,
      },
    },
    exit: (direction: OnboardingSurveyTransitionDirection) => ({
      opacity: 0,
      x: direction === "forward" ? -distance : distance,
      transition: {
        duration: shouldReduceMotion ? 0.14 : 0.3,
        ease: SURVEY_EXIT_EASE,
      },
    }),
  }
}

export const getOnboardingSurveyQuestionTransition = (
  shouldReduceMotion: boolean
): Transition => ({
  duration: shouldReduceMotion ? 0.14 : 0.3,
  ease: SURVEY_ENTER_EASE,
})
