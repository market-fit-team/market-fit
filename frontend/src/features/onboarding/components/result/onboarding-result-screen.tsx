import { OnboardingResultActions } from "@/features/onboarding/components/result/onboarding-result-actions"
import { OnboardingResultCategoryExplorer } from "@/features/onboarding/components/result/onboarding-result-category-explorer"
import { OnboardingResultContent } from "@/features/onboarding/components/result/onboarding-result-content"
import type { OnboardingSurveyResult } from "@/features/onboarding/types/onboarding"

type OnboardingResultScreenProps = {
  surveyResult: OnboardingSurveyResult
}

export function OnboardingResultScreen({
  surveyResult,
}: OnboardingResultScreenProps) {
  return (
    <OnboardingResultContent
      actions={
        <OnboardingResultActions resultCode={surveyResult.result_code} />
      }
      predictionPanel={
        <OnboardingResultCategoryExplorer
          categories={surveyResult.category_recommendations}
          resultCode={surveyResult.result_code}
        />
      }
      profileCode={surveyResult.result_code}
      userProfile={surveyResult.area_user_profile}
    />
  )
}
