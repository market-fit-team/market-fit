import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { OnboardingResultContent } from "@/features/onboarding/components/result/onboarding-result-content"
import { OnboardingResultPredictionPanel } from "@/features/onboarding/components/result/onboarding-result-prediction-panel"
import {
  onboardingAreaRecommendationFixture,
  onboardingResultFixture,
} from "@/features/onboarding/testing/onboarding-fixtures"
import { Button } from "@/shared/components/ui/button"

const meta = {
  title: "Onboarding/Result/OnboardingResultContent",
  component: OnboardingResultContent,
  tags: ["autodocs"],
  args: {
    actions: (
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline">
          결과 공유
        </Button>
        <Button size="sm">내 결과 저장</Button>
      </div>
    ),
    predictionPanel: (
      <OnboardingResultPredictionPanel
        categoryCode={
          onboardingAreaRecommendationFixture.selected_category_code
        }
        categoryName={
          onboardingResultFixture.category_recommendations[0]
            ?.service_category_name ?? "선택 업종"
        }
        recommendations={
          onboardingAreaRecommendationFixture.prediction.recommendations
        }
      />
    ),
    profileCode: onboardingResultFixture.result_code,
    userProfile: onboardingResultFixture.area_user_profile,
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof OnboardingResultContent>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
