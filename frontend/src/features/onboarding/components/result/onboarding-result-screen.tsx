import { Suspense } from "react"
import { OnboardingResultActions } from "@/features/onboarding/components/result/onboarding-result-actions"
import { OnboardingResultContent } from "@/features/onboarding/components/result/onboarding-result-content"
import { OnboardingResultPredictionPanelQuery } from "@/features/onboarding/components/result/onboarding-result-prediction-panel-query"
import { OnboardingResultPredictionPanelSkeleton } from "@/features/onboarding/components/result/onboarding-result-prediction-panel-skeleton"
import type { OnboardingUserProfile } from "@/features/onboarding/types/onboarding"
import { ClientOnly } from "@/shared/components/client-only"

type OnboardingResultScreenProps = {
  profileCode: string
  userProfile: OnboardingUserProfile
}

export function OnboardingResultScreen({
  profileCode,
  userProfile,
}: OnboardingResultScreenProps) {
  const predictionFallback = <OnboardingResultPredictionPanelSkeleton />

  return (
    <OnboardingResultContent
      actions={<OnboardingResultActions profileCode={profileCode} />}
      predictionPanel={
        <ClientOnly fallback={predictionFallback}>
          <Suspense fallback={predictionFallback}>
            <OnboardingResultPredictionPanelQuery profileCode={profileCode} />
          </Suspense>
        </ClientOnly>
      }
      profileCode={profileCode}
      userProfile={userProfile}
    />
  )
}
