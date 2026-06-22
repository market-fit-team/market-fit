import { notFound } from "next/navigation"
import { OnboardingResultScreen } from "@/features/onboarding/components/result/onboarding-result-screen"
import {
  InvalidOnboardingProfileCodeError,
  decodeOnboardingProfileCode,
} from "@/features/onboarding/lib/onboarding-profile-code"

export const dynamic = "force-dynamic"

export default async function OnboardingResultPage(
  props: PageProps<"/onboarding/result/[code]">
) {
  const { code } = await props.params
  let decodedProfile: ReturnType<typeof decodeOnboardingProfileCode>

  try {
    decodedProfile = decodeOnboardingProfileCode(code)
  } catch (error) {
    if (error instanceof InvalidOnboardingProfileCodeError) {
      notFound()
    }

    throw error
  }

  return (
    <OnboardingResultScreen
      profileCode={decodedProfile.profileCode}
      userProfile={decodedProfile.userProfile}
    />
  )
}
