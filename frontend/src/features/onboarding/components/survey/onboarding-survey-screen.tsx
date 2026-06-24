import { OnboardingSurveyClient } from "@/features/onboarding/components/survey/onboarding-survey-client"
import { OnboardingStoreProvider } from "@/features/onboarding/stores/onboarding-store"
import type { OnboardingSurvey } from "@/features/onboarding/types/onboarding"

type OnboardingSurveyScreenProps = {
  survey: OnboardingSurvey
}

export function OnboardingSurveyScreen({
  survey,
}: OnboardingSurveyScreenProps) {
  return (
    <OnboardingStoreProvider survey={survey}>
      <OnboardingSurveyClient />
    </OnboardingStoreProvider>
  )
}
