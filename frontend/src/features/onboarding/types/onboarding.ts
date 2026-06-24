import type {
  SavedSurveyResultListResponseOutput,
  SavedSurveyResultSummaryOutput,
  SurveyAreaRecommendationResponseOutput,
  SurveyDefinitionResponseOutput,
  SurveyResultResponseOutput,
} from "@/shared/api/generated/onboarding/schemas"

export type OnboardingSurvey = SurveyDefinitionResponseOutput
export type OnboardingSurveyQuestion = OnboardingSurvey["questions"][number]
export type OnboardingSurveyOption = OnboardingSurveyQuestion["options"][number]
export type OnboardingSurveyAnswerValue = string | string[]
export type OnboardingSurveyAnswers = Record<
  string,
  OnboardingSurveyAnswerValue
>

export type OnboardingSurveyResult = SurveyResultResponseOutput
export type OnboardingAreaRecommendationResult =
  SurveyAreaRecommendationResponseOutput
export type OnboardingAreaUserProfile =
  OnboardingSurveyResult["area_user_profile"]
export type OnboardingCategoryUserProfile =
  OnboardingSurveyResult["category_user_profile"]
export type OnboardingUserProfile = OnboardingAreaUserProfile
export type OnboardingCategoryRecommendation =
  OnboardingSurveyResult["category_recommendations"][number]
export type OnboardingRecommendation =
  OnboardingAreaRecommendationResult["prediction"]["recommendations"][number]
export type OnboardingSavedResultList = SavedSurveyResultListResponseOutput
export type OnboardingSavedResultSummary = SavedSurveyResultSummaryOutput
