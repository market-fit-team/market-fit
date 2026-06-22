"use client"

import { type ReactNode, createContext, useContext, useState } from "react"
import { createStore, useStore } from "zustand"
import type {
  OnboardingSurvey,
  OnboardingSurveyAnswerValue,
  OnboardingSurveyAnswers,
} from "@/features/onboarding/types/onboarding"

type OnboardingStoreState = {
  answers: OnboardingSurveyAnswers
  currentStep: number
  direction: "enter" | "exit" | "idle"
  survey: OnboardingSurvey
}

type OnboardingStoreActions = {
  resetSurvey: () => void
  setAnswer: (questionId: string, value: OnboardingSurveyAnswerValue) => void
  setCurrentStep: (step: number) => void
  setDirection: (direction: OnboardingStoreState["direction"]) => void
}

export type OnboardingStore = OnboardingStoreState & OnboardingStoreActions

const createOnboardingStore = (survey: OnboardingSurvey) =>
  createStore<OnboardingStore>()((set) => ({
    answers: {},
    currentStep: 0,
    direction: "enter",
    survey,
    resetSurvey: () =>
      set({
        answers: {},
        currentStep: 0,
        direction: "enter",
      }),
    setAnswer: (questionId, value) =>
      set((state) => ({
        answers: {
          ...state.answers,
          [questionId]: value,
        },
      })),
    setCurrentStep: (step) => set({ currentStep: step }),
    setDirection: (direction) => set({ direction }),
  }))

type OnboardingStoreApi = ReturnType<typeof createOnboardingStore>

const OnboardingStoreContext = createContext<OnboardingStoreApi | undefined>(
  undefined
)

type OnboardingStoreProviderProps = {
  children: ReactNode
  survey: OnboardingSurvey
}

export function OnboardingStoreProvider({
  children,
  survey,
}: OnboardingStoreProviderProps) {
  const [store] = useState(() => createOnboardingStore(survey))

  return (
    <OnboardingStoreContext.Provider value={store}>
      {children}
    </OnboardingStoreContext.Provider>
  )
}

export function useOnboardingStore<T>(
  selector: (state: OnboardingStore) => T
): T {
  const onboardingStoreContext = useContext(OnboardingStoreContext)

  if (!onboardingStoreContext) {
    throw new Error(
      "useOnboardingStore는 OnboardingStoreProvider 내부에서만 사용할 수 있습니다."
    )
  }

  return useStore(onboardingStoreContext, selector)
}
