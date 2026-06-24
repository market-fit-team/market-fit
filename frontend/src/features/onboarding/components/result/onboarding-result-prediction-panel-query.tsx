"use client"

import { OnboardingResultPredictionPanel } from "@/features/onboarding/components/result/onboarding-result-prediction-panel"
import { DEFAULT_ONBOARDING_TOP_K } from "@/features/onboarding/lib/onboarding-defaults"
import { useGetAreaRecommendationsSurveysResultsResultCodeAreaRecommendationsGetSuspense } from "@/shared/api/generated/onboarding/endpoints/survey/survey"

type OnboardingResultPredictionPanelQueryProps = {
  resultCode: string
  selectedCategoryCode: string
  selectedCategoryName: string
}

export function OnboardingResultPredictionPanelQuery({
  resultCode,
  selectedCategoryCode,
  selectedCategoryName,
}: OnboardingResultPredictionPanelQueryProps) {
  const { data: result } =
    useGetAreaRecommendationsSurveysResultsResultCodeAreaRecommendationsGetSuspense(
      resultCode,
      {
        category_code: selectedCategoryCode,
        top_k: DEFAULT_ONBOARDING_TOP_K,
      }
    )

  return (
    <OnboardingResultPredictionPanel
      categoryCode={selectedCategoryCode}
      categoryName={selectedCategoryName}
      recommendations={result.prediction.recommendations}
    />
  )
}
