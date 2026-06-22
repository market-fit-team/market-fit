import Link from "next/link"
import { ChartColumnIncreasing, RotateCcw } from "lucide-react"
import { RecommendationCard } from "@/features/onboarding/components/result/recommendation-card"
import { getOnboardingEntryPath } from "@/features/onboarding/lib/onboarding-result"
import type { OnboardingRecommendation } from "@/features/onboarding/types/onboarding"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

type OnboardingResultPredictionPanelProps = {
  recommendations: OnboardingRecommendation[]
}

export function OnboardingResultPredictionPanel({
  recommendations,
}: OnboardingResultPredictionPanelProps) {
  return (
    <>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="h-4 w-1 rounded-full bg-primary" />
        추천 상권 TOP {recommendations.length}
      </h2>

      {recommendations.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {recommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.item_id}
              item={recommendation}
              delay={index * 80}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/60 bg-muted/10">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            현재 추천 가능한 상권 결과가 없습니다.
          </CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-muted/15">
        <CardContent className="flex flex-col gap-3 py-5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ChartColumnIncreasing className="h-4 w-4 text-primary" />
            결과 해석 팁
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            추천 결과는 설문 응답 기반 성향 점수와 상권 특징을 함께 반영한
            참고용 분석입니다. 실제 창업 전에는 현장 조사와 비용 검토를 함께
            진행하는 편이 안전합니다.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 border-t border-border/30 pt-4 sm:flex-row">
        <Button asChild variant="outline" className="w-full sm:flex-1">
          <Link href={getOnboardingEntryPath()}>
            <RotateCcw className="h-4 w-4" />
            설문 다시 하기
          </Link>
        </Button>
      </div>
    </>
  )
}
