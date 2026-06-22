import { Lightbulb, Sparkles } from "lucide-react"
import { ProfileRadar } from "@/features/onboarding/components/result/profile-radar"
import { ProfileSummary } from "@/features/onboarding/components/result/profile-summary"
import { buildOnboardingInsights } from "@/features/onboarding/lib/onboarding-result"
import type { OnboardingUserProfile } from "@/features/onboarding/types/onboarding"
import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

type OnboardingResultContentProps = {
  actions?: React.ReactNode
  predictionPanel: React.ReactNode
  profileCode: string
  userProfile: OnboardingUserProfile
}

export function OnboardingResultContent({
  actions,
  predictionPanel,
  profileCode,
  userProfile,
}: OnboardingResultContentProps) {
  const insights = buildOnboardingInsights(userProfile)

  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-gradient-to-b from-background via-background to-accent/10 px-5 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 md:mb-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                분석 완료
              </Badge>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                맞춤 상권 추천 결과
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                입력한 창업 성향 점수를 기준으로 추천 상권을 분석했습니다.
              </p>
            </div>

            {actions}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <aside className="space-y-5 lg:col-span-5">
            <div className="space-y-5 lg:sticky lg:top-8">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="h-4 w-1 rounded-full bg-primary" />
                나의 창업 성향
              </h2>

              <Card>
                <CardContent className="flex items-center justify-center pt-4 pb-2">
                  <ProfileRadar profile={userProfile} />
                </CardContent>
              </Card>

              <ProfileSummary
                profileCode={profileCode}
                userProfile={userProfile}
              />

              <Card className="border-primary/15 bg-primary/[0.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-primary/70" />
                    핵심 인사이트
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                  {insights.map((insight) => (
                    <div key={insight.text} className="flex items-start gap-2">
                      <span
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          insight.tone === "positive"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      <span>{insight.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </aside>

          <section className="space-y-5 lg:col-span-7">
            {predictionPanel}
          </section>
        </div>
      </div>
    </main>
  )
}
