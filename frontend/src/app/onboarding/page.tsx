import { OnboardingSurveyScreen } from "@/features/onboarding/components/survey/onboarding-survey-screen"
import { getActiveOnboardingSurveyDefinition } from "@/features/onboarding/lib/onboarding-server-api"

export const revalidate = 3600

export default async function OnboardingPage() {
  const survey = await getActiveOnboardingSurveyDefinition()

  return <OnboardingSurveyScreen survey={survey} />
}
