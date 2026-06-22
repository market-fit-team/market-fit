"use client"

import { OnboardingResultPredictionPanel } from "@/features/onboarding/components/result/onboarding-result-prediction-panel"
import { DEFAULT_ONBOARDING_TOP_K } from "@/features/onboarding/lib/onboarding-defaults"
import { useGetSurveyResultByCodeSurveysResultsProfileCodeGetSuspense } from "@/shared/api/generated/onboarding/endpoints/survey/survey"

type OnboardingResultPredictionPanelQueryProps = {
  profileCode: string
}

export function OnboardingResultPredictionPanelQuery({
  profileCode,
}: OnboardingResultPredictionPanelQueryProps) {
  const { data: result } =
    useGetSurveyResultByCodeSurveysResultsProfileCodeGetSuspense(profileCode, {
      top_k: DEFAULT_ONBOARDING_TOP_K,
    })

  return (
    <OnboardingResultPredictionPanel
      recommendations={result.prediction.recommendations}
    />
  )
}
