"use client"

/**
 * Design4 결과 페이지
 * - 목 데이터를 기반으로 추천 상권과 사용자 프로필을 시각화
 * - 레이더 차트, 프로필 수치 바, 추천 상권 카드 리스트를 포함
 * - 공유 링크 복사 기능 제공
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

export default function Design4ResultPage() {
  const data = MOCK_PREVIEW_RESPONSE
  const { profile, prediction } = data
  const userProfile = profile.user_profile
  const recommendations = prediction.recommendations

  /** 공유 링크 복사 상태 */
  const [copied, setCopied] = useState(false)

  /** 공유 링크 복사 핸들러 */
  const handleCopyShare = async () => {
    const url = profile.share_url
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 클립보드 접근 불가 시 fallback
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-accent/10">
      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* 상단 헤더 */}
        <header className="mb-8 space-y-4">
          <div
            className="space-y-2"
            style={{ animation: "fadeInUp 0.5s ease-out both" }}
          >
            <Badge variant="secondary" className="mb-2">
              분석 완료
            </Badge>
            <h1 className="text-2xl font-bold text-foreground">
              맞춤 상권 추천 결과
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {userProfile.profile_name}님의 창업 성향을 분석하여
              <br />
              가장 적합한 상권 {recommendations.length}곳을 추천해 드립니다.
            </p>
          </div>

          {/* 공유 영역 */}
          <div
            className="flex items-center gap-2"
            style={{ animation: "fadeInUp 0.5s ease-out 100ms both" }}
          >
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
            <span className="truncate font-mono text-[10px] text-muted-foreground">
              {profile.profile_code}
            </span>
          </div>
        </header>

        {/* 프로필 분석 섹션 */}
        <section
          className="mb-8 space-y-4"
          style={{ animation: "fadeInUp 0.5s ease-out 200ms both" }}
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-4 w-1 rounded-full bg-primary" />
            나의 창업 성향
          </h2>

          {/* 레이더 차트 카드 */}
          <Card>
            <CardContent className="pt-4">
              <ProfileRadar
                profile={userProfile as unknown as Record<string, number>}
              />
            </CardContent>
          </Card>

          {/* 프로필 수치 요약 */}
          <ProfileSummary
            userProfile={userProfile}
            profileCode={profile.profile_code}
          />

          {/* 핵심 인사이트 카드 */}
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                💡 핵심 인사이트
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs leading-relaxed text-muted-foreground">
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
        </section>

        {/* 추천 상권 섹션 */}
        <section
          className="mb-8 space-y-4"
          style={{ animation: "fadeInUp 0.5s ease-out 400ms both" }}
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="h-4 w-1 rounded-full bg-primary" />
            추천 상권 TOP {recommendations.length}
          </h2>

          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <RecommendationCard
                key={rec.item_id}
                item={rec}
                delay={idx * 100}
              />
            ))}
          </div>
        </section>

        {/* 하단 CTA */}
        <footer
          className="space-y-3 pb-8"
          style={{ animation: "fadeInUp 0.5s ease-out 600ms both" }}
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.history.back()}
          >
            ← 설문 다시 하기
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            이 결과는 AI 모델의 분석을 기반으로 하며 실제 창업 시 전문 상담을
            권장합니다.
          </p>
        </footer>
      </div>

      {/* 커스텀 애니메이션 */}
      <style jsx global>{`
        @keyframes fadeInUp {
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
        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          isHigh ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      <span>{text}</span>
    </div>
  )
}
