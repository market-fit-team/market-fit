"use client"

/**
 * Design8 결과 페이지 (design4 개선판)
 *
 * 핵심 개선사항:
 * 1. 반응형 레이아웃: 모바일 단일 컬럼 → 데스크톱 2컬럼 그리드
 *    - 좌측: 프로필 분석 (레이더 + 수치 바 + 인사이트) — sticky
 *    - 우측: 추천 상권 카드 리스트
 * 2. 이모지 제거 → SVG 아이콘 또는 텍스트로 대체
 * 3. 레이아웃 시프트 방지: 고정 높이, aspect-ratio, minHeight 활용
 * 4. max-w-6xl로 넓은 데스크톱 화면 활용
 */
import { useState } from "react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { ProfileRadar } from "../_components/profile-radar"
import { ProfileSummary } from "../_components/profile-summary"
import { RecommendationCard } from "../_components/recommendation-card"
import { MOCK_PREVIEW_RESPONSE } from "../_fixtures/response-data"

export default function Design8ResultPage() {
  const data = MOCK_PREVIEW_RESPONSE
  const { profile, prediction } = data
  const userProfile = profile.user_profile
  const recommendations = prediction.recommendations

  const [copied, setCopied] = useState(false)

  const handleCopyShare = async () => {
    const url = profile.share_url
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/10">
      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
        {/* ── 상단 헤더 ── */}
        <header
          className="mb-8 md:mb-10"
          style={{ animation: "d8-fadeInUp 0.5s ease-out both" }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary">분석 완료</Badge>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                맞춤 상권 추천 결과
              </h1>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                {userProfile.profile_name}님의 창업 성향을 분석하여 가장 적합한
                상권 {recommendations.length}곳을 추천해 드립니다.
              </p>
            </div>

            {/* 공유 영역 */}
            <div className="flex shrink-0 items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyShare}
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <svg
                      className="h-3.5 w-3.5 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    복사됨!
                  </>
                ) : (
                  <>
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    결과 공유하기
                  </>
                )}
              </Button>
              <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
                {profile.profile_code}
              </span>
            </div>
          </div>
        </header>

        {/* ── 메인 콘텐츠: 2컬럼 그리드 (데스크톱) ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* 좌측 — 프로필 분석 (데스크톱에서 sticky) */}
          <aside
            className="space-y-5 lg:col-span-5"
            style={{ animation: "d8-fadeInUp 0.5s ease-out 150ms both" }}
          >
            <div className="space-y-5 lg:sticky lg:top-8">
              {/* 섹션 제목 */}
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="h-4 w-1 rounded-full bg-primary" />
                나의 창업 성향
              </h2>

              {/* 레이더 차트 */}
              <Card>
                <CardContent className="flex items-center justify-center pt-4 pb-2">
                  <ProfileRadar
                    profile={userProfile as unknown as Record<string, number>}
                  />
                </CardContent>
              </Card>

              {/* 프로필 수치 바 */}
              <ProfileSummary
                userProfile={userProfile}
                profileCode={profile.profile_code}
              />

              {/* 핵심 인사이트 */}
              <Card className="border-primary/15 bg-primary/[0.02]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <svg
                      className="h-4 w-4 text-primary/70"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    핵심 인사이트
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 text-xs leading-relaxed text-muted-foreground">
                  <InsightItem
                    isHigh={userProfile.stability_level >= 0.7}
                    text={
                      userProfile.stability_level >= 0.7
                        ? "안정적인 운영을 선호하며, 꾸준한 매출이 중요합니다."
                        : "성장 잠재력을 중시하며, 도전적인 상권도 고려합니다."
                    }
                  />
                  <InsightItem
                    isHigh={userProfile.resident_focus_level >= 0.7}
                    text={
                      userProfile.resident_focus_level >= 0.7
                        ? "동네 주민 기반의 안정적인 고객층이 잘 맞습니다."
                        : "유동 인구와 다양한 고객층을 기대합니다."
                    }
                  />
                  <InsightItem
                    isHigh={userProfile.rent_sensitivity_level >= 0.7}
                    text={
                      userProfile.rent_sensitivity_level >= 0.7
                        ? "임대료 부담을 줄이고 운영 안정성을 높이는 전략이 유리합니다."
                        : "입지 투자에 적극적이어서 프리미엄 상권도 어울립니다."
                    }
                  />
                </CardContent>
              </Card>
            </div>
          </aside>

          {/* 우측 — 추천 상권 리스트 */}
          <section
            className="space-y-5 lg:col-span-7"
            style={{ animation: "d8-fadeInUp 0.5s ease-out 300ms both" }}
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="h-4 w-1 rounded-full bg-primary" />
              추천 상권 TOP {recommendations.length}
            </h2>

            {/* 추천 카드 그리드 — 데스크톱 2컬럼, 태블릿 1컬럼 */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {recommendations.map((rec, idx) => (
                <RecommendationCard
                  key={rec.item_id}
                  item={rec}
                  delay={idx * 80}
                />
              ))}
            </div>

            {/* 하단 CTA */}
            <div className="space-y-3 border-t border-border/30 pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.history.back()}
              >
                ← 설문 다시 하기
              </Button>
              <p className="text-center text-[10px] text-muted-foreground">
                이 결과는 AI 모델의 분석을 기반으로 하며 실제 창업 시 전문
                상담을 권장합니다.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* 커스텀 애니메이션 */}
      <style jsx global>{`
        @keyframes d8-fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

/** 인사이트 항목 */
function InsightItem({ isHigh, text }: { isHigh: boolean; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
          isHigh ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      <span>{text}</span>
    </div>
  )
}
