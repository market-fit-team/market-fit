import { notFound } from "next/navigation"
import { OnboardingResultScreen } from "@/features/onboarding/components/result/onboarding-result-screen"
import { getOnboardingErrorStatus } from "@/features/onboarding/lib/onboarding-error"
import { getOnboardingResultByCode } from "@/features/onboarding/lib/onboarding-server-api"

export const dynamic = "force-dynamic"

export default async function OnboardingResultPage(
  props: PageProps<"/onboarding/result/[code]">
) {
  const { code } = await props.params

  try {
    const surveyResult = await getOnboardingResultByCode(code)

    return <OnboardingResultScreen surveyResult={surveyResult} />
  } catch (error) {
    if (getOnboardingErrorStatus(error) === 404) {
      notFound()
    }

    throw error
  }
}
