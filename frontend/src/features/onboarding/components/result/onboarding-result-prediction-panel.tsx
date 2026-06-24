import Link from "next/link"
import { RotateCcw } from "lucide-react"
import { RecommendationCard } from "@/features/onboarding/components/result/recommendation-card"
import { getOnboardingEntryPath } from "@/features/onboarding/lib/onboarding-result"
import type { OnboardingRecommendation } from "@/features/onboarding/types/onboarding"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"

type OnboardingResultPredictionPanelProps = {
  categoryCode: string
  categoryName: string
  recommendations: OnboardingRecommendation[]
}

export function OnboardingResultPredictionPanel({
  categoryCode,
  categoryName,
  recommendations,
}: OnboardingResultPredictionPanelProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="h-4 w-1 rounded-full bg-primary" />
          추천 상권 TOP {recommendations.length}
        </h2>
        <Badge variant="outline" className="rounded-full text-[11px]">
          {categoryName} · {categoryCode}
        </Badge>
      </div>

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
