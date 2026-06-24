import { DEFAULT_ONBOARDING_PROFILE_NAME } from "@/features/onboarding/lib/onboarding-defaults"
import type {
  OnboardingSurveyAnswerValue,
  OnboardingSurveyAnswers,
  OnboardingSurveyQuestion,
} from "@/features/onboarding/types/onboarding"
import {
  type SaveSurveyProfileRequestOutput,
  SaveSurveyProfileRequest as SaveSurveyProfileRequestSchema,
  type SaveSurveyResultRequestOutput,
  SaveSurveyResultRequest as SaveSurveyResultRequestSchema,
  type SurveyPreviewRequestOutput,
  SurveyPreviewRequest as SurveyPreviewRequestSchema,
} from "@/shared/api/generated/onboarding/schemas"

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
  profileName = DEFAULT_ONBOARDING_PROFILE_NAME,
}: {
  answers: OnboardingSurveyAnswers
  profileName?: string
}): SurveyPreviewRequestOutput => {
  return SurveyPreviewRequestSchema.parse({
    answers,
    profile_name: profileName,
  })
}

export const buildSaveSurveyResultRequest = ({
  resultCode,
  savedLabel,
}: {
  resultCode: string
  savedLabel?: string
}): SaveSurveyResultRequestOutput => {
  return SaveSurveyResultRequestSchema.parse({
    result_code: resultCode,
    saved_label: savedLabel,
  })
}

export const buildSaveSurveyProfileRequest = ({
  resultCode,
}: {
  resultCode: string
}): SaveSurveyProfileRequestOutput => {
  return SaveSurveyProfileRequestSchema.parse({
    result_code: resultCode,
  })
}
