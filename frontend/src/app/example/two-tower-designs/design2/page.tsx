"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BrainCircuit, Sparkles } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { SurveyWizard } from "./_components/survey-wizard"
import {
  COMMERCIAL_AREAS,
  calculateMatchScore,
  calculateUserProfile,
} from "./_fixtures/mockData"

/**
 * Two-Tower Design 2 창업 성향 설문 페이지 진입 컴포넌트
 */
export default function Design2Page() {
  const router = useRouter()
  // 설문 시작 여부 상태
  const [started, setStarted] = useState(false)
  // 분석 진행 상태 (설문 완료 후 AI 로딩 연출용)
  const [analyzing, setAnalyzing] = useState(false)

  // 설문 응답 완료 처리 및 결과 연산
  const handleSurveyComplete = (
    answers: Record<string, string | string[]>,
    categoryCode: string
  ) => {
    setAnalyzing(true)

    // 실제 복잡한 투타워 딥러닝 연산이 돌아가는 듯한 시각적 효과 연출 (1.8초)
    setTimeout(() => {
      // 1. 유저 프로필 성향 지표 점수 산출
      const userProfile = calculateUserProfile(answers, categoryCode)

      // 2. 고유 공유 코드 생성 (base36 8자리)
      const profileCode = Math.random().toString(36).substring(2, 10)

      // 3. 상권 매칭 랭킹 계산
      const recommendations = COMMERCIAL_AREAS.map((area) => {
        const rawScore = calculateMatchScore(userProfile, area)

        // 업종 이름 매핑
        let categoryName = "서비스업"
        if (categoryCode === "CS100001") categoryName = "한식음식점"
        else if (categoryCode === "CS100005") categoryName = "제과점"
        else if (categoryCode === "CS100009") categoryName = "커피전문점"
        else if (categoryCode === "CS100010") categoryName = "패스트푸드점"
        else if (categoryCode === "CS200001") categoryName = "일반미용업"

        return {
          rank: 0,
          score: rawScore,
          item_id: `${area.item_id}:${categoryCode}`,
          area_name: area.area_name,
          service_category_name: categoryName,
          area_profile_type: area.area_profile_type,
          sales_amount: area.sales_amount,
          weekend_sales_ratio: area.weekend_sales_ratio,
          evening_sales_ratio: area.evening_sales_ratio,
          resident_population: area.resident_population,
          worker_population: area.worker_population,
          subway_commercial_trend_score: area.subway_commercial_trend_score,
          category_opportunity_score: area.category_opportunity_score,
          demand_gap_score: area.demand_gap_score,
        }
      })
        .sort((a, b) => b.score - a.score)
        .map((item, idx) => ({ ...item, rank: idx + 1 }))

      // 4. LocalStorage에 임시 저장 (결과 화면에서 불러올 수 있도록 보장)
      const mockResult = {
        profile: {
          auth_user_uuid: null,
          profile_code: profileCode,
          profile_schema_version: 3,
          survey_response_id: Math.floor(Math.random() * 1000) + 1,
          survey_slug: "founder-fit-10-final",
          survey_version: 1,
          survey_code: "A",
          scoring_version: "founder_fit_v1",
          share_path: `/example/two-tower-designs/design2/${profileCode}`,
          share_url: `${window.location.origin}/example/two-tower-designs/design2/${profileCode}`,
          source: "survey",
          updated_at: new Date().toISOString(),
          raw_answers: answers,
          user_profile: userProfile,
        },
        prediction: {
          trained_at: new Date().toISOString(),
          model_signature: `onboarding_two_tower:client_${profileCode}`,
          top_k: 5,
          profile_code: profileCode,
          profile_schema_version: 3,
          survey_code: "A",
          share_path: `/example/two-tower-designs/design2/${profileCode}`,
          share_url: `${window.location.origin}/example/two-tower-designs/design2/${profileCode}`,
          user_profile: userProfile,
          recommendations: recommendations.slice(0, 5),
        },
      }

      localStorage.setItem(
        `two_tower_profile_${profileCode}`,
        JSON.stringify(mockResult)
      )

      // 5. 결과 페이지로 다이나믹 라우팅
      router.push(`/example/two-tower-designs/design2/${profileCode}`)
    }, 1800)
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_top_right,_rgba(240,253,244,0.9),_rgba(255,255,255,0.85)_34%,_rgba(241,245,249,0.9)_100%)] px-4 py-12 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_right,_rgba(6,78,59,0.15),_rgba(15,23,42,0.95)_40%)]">
      {/* 백그라운드 디자인 오브제 */}
      <div className="pointer-events-none absolute top-20 right-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 left-10 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />

      {/* 분석 중 화면 연출 */}
      {analyzing ? (
        <div className="z-10 mx-auto flex max-w-md animate-pulse flex-col items-center justify-center space-y-6 text-center">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-24 w-24 animate-ping rounded-full border-4 border-emerald-500/20" />
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <BrainCircuit className="absolute h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              성향 지표 및 상권 추천 연산 중
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              답변해주신 10개 문항의 가중치 가이드라인을 바탕으로 유저 타워
              임베딩을 구성하고 적합 상권을 실시간 매칭 중입니다...
            </p>
          </div>
        </div>
      ) : !started ? (
        /* 인트로 대기 화면 */
        <div className="z-10 mx-auto w-full max-w-2xl space-y-8">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/50 bg-emerald-50 px-3 py-1 dark:border-emerald-800/30 dark:bg-emerald-950/30">
              <Sparkles className="h-3.5 w-3.5 fill-emerald-500/20 text-emerald-600 dark:text-emerald-400" />
              <span className="font-mono text-xs font-semibold text-emerald-800 dark:text-emerald-400">
                Two-Tower AI Recommendation Engine
              </span>
            </div>

            <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-slate-800 sm:text-5xl dark:text-white">
              창업 성향 진단 및 <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                맞춤형 상권 매칭
              </span>
            </h1>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-slate-500 dark:text-slate-400">
              10개의 간단한 질문으로 당신의 자영업 페르소나 및 창업 성향 점수를
              산출하고, 행정동별 실제 매칭 적합도가 가장 높은 최적 상권을
              점수화하여 추천합니다.
            </p>
          </div>

          <Card className="overflow-hidden rounded-2xl border-0 bg-white/60 shadow-2xl backdrop-blur-xl dark:bg-slate-900/60">
            <CardContent className="space-y-5 p-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  이런 분석 결과를 제공합니다:
                </h3>

                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        9대 성향 다이어그램
                      </p>
                      <p className="mt-0.5 leading-normal text-slate-500 dark:text-slate-400">
                        안정성, 역세권의존, 주말/야간 등 9가지 지표 점수 시각화
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        최적지 상세 인포그래픽
                      </p>
                      <p className="mt-0.5 leading-normal text-slate-500 dark:text-slate-400">
                        평균 월 매출액, 주말 비중, 배후 주거/직장인 분포 매칭
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        결정론적 고유 코드
                      </p>
                      <p className="mt-0.5 leading-normal text-slate-500 dark:text-slate-400">
                        언제 어디서 접속해도 나의 진단 내용이 고스란히 복원되는
                        링크 제공
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300">
                        저장 및 마이페이지 백업
                      </p>
                      <p className="mt-0.5 leading-normal text-slate-500 dark:text-slate-400">
                        데모 로그인 회원 기준 영구적으로 결과를 보관하고 추적
                        가능
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setStarted(true)}
                className="h-12 w-full rounded-xl bg-emerald-600 text-sm font-bold tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
              >
                무료 진단 시작하기
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* 설문 마법사 실행 */
        <div className="z-10 w-full">
          <SurveyWizard onComplete={handleSurveyComplete} />
        </div>
      )}
    </div>
  )
}
