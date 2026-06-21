import * as React from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { RecommendationCard } from "../_components/RecommendationCard"
import { mockResult } from "../_fixtures/mockData"

interface ResultPageProps {
  params: {
    res: string
  }
}

export default function ResultPage({ params }: ResultPageProps) {
  const profileCode = params.res

  // In a real scenario, we would fetch data based on the profileCode.
  // Here we just use the mockResult.
  const { profile, prediction } = mockResult

  const isValidCode = profileCode === profile.profile_code

  if (!isValidCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="mb-4 text-2xl font-bold">결과를 찾을 수 없습니다</h1>
        <p className="mb-8 text-muted-foreground">
          유효하지 않은 프로필 코드입니다.
        </p>
        <Button asChild>
          <Link href="/example/two-tower-designs/design1">설문 다시하기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-24">
      {/* Header */}
      <div className="rounded-b-[2.5rem] bg-primary px-4 pt-12 pb-20 text-center text-primary-foreground shadow-md">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-medium text-primary-foreground backdrop-blur-sm">
            분석 완료
          </div>
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight md:text-4xl">
            {profile.user_profile.profile_name}
          </h1>
          <p className="text-lg text-primary-foreground/80">
            선택하신 성향을 바탕으로 최적의 상권과 업종을 추천해 드립니다.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto -mt-10 max-w-3xl space-y-8 px-4">
        {/* Profile Summary Card */}
        <div className="relative z-10 rounded-2xl border border-border/40 bg-background p-6 shadow-lg md:p-8">
          <h2 className="mb-4 text-xl font-bold">나의 창업 성향 요약</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-muted/30 p-4 text-center">
              <div className="mb-1 text-xs text-muted-foreground">
                안정성 지수
              </div>
              <div className="text-2xl font-bold text-primary">
                {(profile.user_profile.stability_level * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded-xl bg-muted/30 p-4 text-center">
              <div className="mb-1 text-xs text-muted-foreground">
                동네상권 선호
              </div>
              <div className="text-2xl font-bold text-primary">
                {(profile.user_profile.resident_focus_level * 100).toFixed(0)}%
              </div>
            </div>
            <div className="rounded-xl bg-muted/30 p-4 text-center">
              <div className="mb-1 text-xs text-muted-foreground">
                월세 민감도
              </div>
              <div className="text-2xl font-bold text-primary">
                {(profile.user_profile.rent_sensitivity_level * 100).toFixed(0)}
                %
              </div>
            </div>
            <div className="rounded-xl bg-muted/30 p-4 text-center">
              <div className="mb-1 text-xs text-muted-foreground">
                주말 선호도
              </div>
              <div className="text-2xl font-bold text-primary">
                {(profile.user_profile.weekend_preference_level * 100).toFixed(
                  0
                )}
                %
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations Section */}
        <div className="mt-12 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <h2 className="text-2xl font-bold tracking-tight">
              추천 상권 TOP 3
            </h2>
            <div className="h-px flex-1 bg-border/60"></div>
          </div>

          <div className="flex flex-col gap-6">
            {prediction.recommendations.map((rec) => (
              <RecommendationCard key={rec.item_id} recommendation={rec} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mx-auto mt-12 flex max-w-3xl flex-col justify-center gap-4 px-4 sm:flex-row">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full font-bold"
          asChild
        >
          <Link href="/example/two-tower-designs/design1">설문 다시하기</Link>
        </Button>
        <Button
          size="lg"
          className="rounded-full font-bold shadow-md transition-shadow hover:shadow-lg"
        >
          결과 저장하기 (로그인 필요)
        </Button>
      </div>
    </div>
  )
}
