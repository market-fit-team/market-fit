import {
  DEFAULT_ONBOARDING_PREFERRED_CATEGORY_CODE,
  DEFAULT_ONBOARDING_PROFILE_NAME,
  DEFAULT_ONBOARDING_TOP_K,
} from "@/features/onboarding/lib/onboarding-defaults"
import type {
  OnboardingSurveyAnswerValue,
  OnboardingSurveyAnswers,
  OnboardingSurveyQuestion,
} from "@/features/onboarding/types/onboarding"
import {
  type SaveSurveyResultRequestOutput,
  SaveSurveyResultRequest as SaveSurveyResultRequestSchema,
  type SurveyPreviewRequestOutput,
  SurveyPreviewRequest as SurveyPreviewRequestSchema,
} from "@/shared/api/generated/onboarding/schemas"

export { DEFAULT_ONBOARDING_TOP_K }

export const hasAnsweredQuestion = (
  question: OnboardingSurveyQuestion,
  answer: OnboardingSurveyAnswerValue | undefined
) => {
  if (question.selection_type === "single") {
    return typeof answer === "string" && answer.length > 0
  }

  return Array.isArray(answer) && answer.length > 0
}

export const buildSurveyPreviewRequest = ({
  answers,
  preferredCategoryCode = DEFAULT_ONBOARDING_PREFERRED_CATEGORY_CODE,
  profileName = DEFAULT_ONBOARDING_PROFILE_NAME,
  topK = DEFAULT_ONBOARDING_TOP_K,
}: {
  answers: OnboardingSurveyAnswers
  preferredCategoryCode?: string
  profileName?: string
  topK?: number
}): SurveyPreviewRequestOutput => {
  return SurveyPreviewRequestSchema.parse({
    answers,
    preferred_category_code: preferredCategoryCode,
    profile_name: profileName,
    top_k: topK,
  })
}

export const buildSaveSurveyResultRequest = ({
  profileCode,
  topK = DEFAULT_ONBOARDING_TOP_K,
}: {
  profileCode: string
  topK?: number
}): SaveSurveyResultRequestOutput => {
  return SaveSurveyResultRequestSchema.parse({
    profile_code: profileCode,
    top_k: topK,
  })
}
