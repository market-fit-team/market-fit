"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { CATEGORIES, type FullSurveyResult } from "../_fixtures/mockData"

interface ResultDetailsProps {
  data: FullSurveyResult
}

export function ResultDetails({ data }: ResultDetailsProps) {
  const router = useRouter()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState<boolean>(
    data.profile.auth_user_uuid !== null || false
  )

  const { profile, prediction } = data
  const { user_profile } = profile
  const category = CATEGORIES.find(
    (c) => c.code === user_profile.preferred_category_code
  )

  // 간단한 토스트 알림 함수
  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 2500)
  }

  // 결과 URL 복사 및 공유하기
  const handleCopyLink = async () => {
    if (typeof window !== "undefined") {
      const shareUrl = `${window.location.origin}/example/two-tower-designs/design6/${profile.profile_code}`
      try {
        await navigator.clipboard.writeText(shareUrl)
        showToast("📋 결과 공유 링크가 클립보드에 복사되었습니다!")
      } catch {
        showToast("❌ 링크 복사에 실패했습니다.")
      }
    }
  }

  // 가상의 로그인 결과 저장 기능 (PUT /surveys/me/profile 시뮬레이션)
  const handleSaveResult = () => {
    if (isSaved) {
      showToast("💾 이미 내 보관함에 저장된 설문 결과입니다.")
      return
    }

    // 가상 저장 처리 (auth_user_uuid를 모의 발급하고 localStorage 업데이트)
    const updatedData: FullSurveyResult = {
      ...data,
      profile: {
        ...data.profile,
        auth_user_uuid: "auth_85d9ee80-7047-4011-b5be-e4150319f858",
        user_profile: {
          ...data.profile.user_profile,
          profile_name: "내 설문 저장본",
        },
      },
    }

    localStorage.setItem(
      `survey_res_${profile.profile_code}`,
      JSON.stringify(updatedData)
    )
    setIsSaved(true)
    showToast("💾 회원 계정에 설문 분석 결과가 안전하게 저장되었습니다!")
  }

  // 프로필 지표 리스트 매핑
  const profileMetrics = [
    {
      label: "💰 투자 규모 선호",
      val: user_profile.budget_level,
      desc: "높을수록 대규모 초기 투자 지향",
    },
    {
      label: "🛡️ 안정성 지향도",
      val: user_profile.stability_level,
      desc: "높을수록 리스크 없는 꾸준함 선호",
    },
    {
      label: "🚇 역세권 의존도",
      val: user_profile.subway_dependency_level,
      desc: "높을수록 지하철역과의 근접성 중요시",
    },
    {
      label: "☀️ 주말 영업 선호",
      val: user_profile.weekend_preference_level,
      desc: "높을수록 주말 및 공휴일 상권 지향",
    },
    {
      label: "🌙 저녁 영업 선호",
      val: user_profile.evening_preference_level,
      desc: "높을수록 퇴근 이후 시간대 매출 중요시",
    },
    {
      label: "🏠 상주 주민 집중도",
      val: user_profile.resident_focus_level,
      desc: "높을수록 동네 거주민 생활밀착 상권 선호",
    },
    {
      label: "🏢 직장인 집중도",
      val: user_profile.worker_focus_level,
      desc: "높을수록 오피스 빌딩 밀집 구역 선호",
    },
    {
      label: "📉 월세 민감도",
      val: user_profile.rent_sensitivity_level,
      desc: "높을수록 초기 임대료 지출 절감 희망",
    },
    {
      label: "⚔️ 경쟁 수용도",
      val: user_profile.competition_tolerance_level,
      desc: "높을수록 경쟁이 있어도 대형상권 지향",
    },
  ]

  // 상권 프로필 타입 라벨 매핑
  const getAreaProfileLabel = (
    type: "residential" | "office" | "subway" | "mixed"
  ) => {
    switch (type) {
      case "residential":
        return "🏠 주거 중심형 상권"
      case "office":
        return "🏢 오피스 밀집형 상권"
      case "subway":
        return "🚇 역세권 유동형 상권"
      case "mixed":
        return "🌐 융합 복합형 상권"
      default:
        return "상권"
    }
  }

  // 매출 포맷터 (예: 1950000000 -> 19.5억원)
  const formatSalesAmount = (amount: number): string => {
    const eok = amount / 100000000
    return `${eok.toFixed(1)} 억원`
  }

  return (
    <div className="relative mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      {/* 백그라운드 퍼플/블루 글로우 구체 */}
      <div className="pointer-events-none absolute top-1/4 -left-20 -z-10 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 -z-10 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />

      {/* 헤더 섹션 */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
            📊 AI Two-Tower 분석 리포트
          </span>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-100 md:text-3xl">
            <span className="bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">
              {user_profile.profile_name}
            </span>{" "}
            의 맞춤 상권 추천
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            분석 공유 코드:{" "}
            <code className="font-mono font-bold text-cyan-400">
              {profile.profile_code}
            </code>
          </p>
        </div>

        {/* 상단 버튼 컨트롤 */}
        <div className="flex gap-2">
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="h-10 rounded-xl border-slate-800 px-4 font-medium text-slate-300 hover:bg-slate-800"
          >
            🔗 결과 공유하기
          </Button>
          <Button
            onClick={handleSaveResult}
            className={`h-10 rounded-xl border-none px-4 font-bold transition-all ${
              isSaved
                ? "cursor-default border border-emerald-500/30 bg-emerald-600/20 text-emerald-400"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500"
            }`}
          >
            {isSaved ? "✓ 내 저장본 저장됨" : "💾 결과 내 계정 저장"}
          </Button>
        </div>
      </div>

      {/* 2컬럼 레이아웃 */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 왼쪽 1컬럼: 대표님 창업 성향 지표 카드 */}
        <div className="h-fit space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl lg:col-span-1">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-md font-bold text-slate-200">
              🛠️ 창업 성향 프로필 벡터
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              설문 10문항을 가중 처리하여 도출한 9개 영역 지표입니다.
            </p>
          </div>

          {/* 선호 업종 카드 */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 p-3.5">
            <span className="text-3xl">{category?.emoji}</span>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-violet-400">
                SELECTED CATEGORY
              </span>
              <h3 className="text-sm font-extrabold text-slate-200">
                {category?.name}
              </h3>
              <p className="line-clamp-1 text-[11px] text-slate-500">
                {category?.description}
              </p>
            </div>
          </div>

          {/* 9대 성향 지표 가로 진척도 목록 */}
          <div className="space-y-4 pt-2">
            {profileMetrics.map((metric) => (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {metric.label}
                  </span>
                  <span className="font-bold text-violet-400">
                    {(metric.val * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                    style={{ width: `${metric.val * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-600">{metric.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 오른쪽 2컬럼: 추천 상권 리스트 목록 */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-md flex items-center gap-2 font-extrabold text-slate-200">
              🏆 AI 매칭 추천 상권 Top 5
            </h2>
            <span className="text-xs text-slate-500">
              정렬 기준: 추천 유사도 스코어
            </span>
          </div>

          <div className="space-y-5">
            {prediction.recommendations.map((rec) => (
              <div
                key={rec.rank}
                className="group relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-slate-700/60 hover:bg-slate-900/80 md:p-6"
              >
                {/* 랭킹 뱃지 */}
                <div className="absolute top-4 left-4 flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-black text-white shadow-md shadow-violet-500/20">
                  {rec.rank}
                </div>

                <div className="space-y-4 pl-10">
                  {/* 상단 이름 및 설명 */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-800/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-100 transition-colors group-hover:text-violet-300">
                          서울 {rec.area_name}
                        </h3>
                        <span className="rounded-full border border-slate-700/40 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          {getAreaProfileLabel(rec.area_profile_type)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        권장 업종:{" "}
                        <span className="font-semibold text-slate-300">
                          {rec.service_category_name}
                        </span>
                      </p>
                    </div>

                    {/* 투타워 매칭 스코어 */}
                    <div className="text-right">
                      <span className="block text-[10px] font-bold text-slate-500">
                        매칭 지수
                      </span>
                      <span className="text-md font-mono font-extrabold text-cyan-400">
                        {rec.score.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* 주요 상권 데이터 수치 지표 (그리드) */}
                  <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-5">
                    <div className="rounded-xl border border-slate-800/40 bg-slate-950/40 p-2.5">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        평균 연 매출
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-300">
                        {formatSalesAmount(rec.sales_amount)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-800/40 bg-slate-950/40 p-2.5">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        상주 주민수
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-300">
                        {rec.resident_population.toLocaleString()} 명
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-800/40 bg-slate-950/40 p-2.5">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        직장인 인구
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-300">
                        {rec.worker_population.toLocaleString()} 명
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-800/40 bg-slate-950/40 p-2.5">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        주말 매출비중
                      </span>
                      <span className="mt-1 block text-xs font-bold text-slate-300">
                        {Math.round(rec.weekend_sales_ratio * 100)} %
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-800/40 bg-slate-950/40 p-2.5">
                      <span className="block text-[10px] font-semibold text-slate-500">
                        저녁 매출비중
                      </span>
                      <span className="mt-1 block text-xs font-bold text-violet-400">
                        {Math.round(rec.evening_sales_ratio * 100)} %
                      </span>
                    </div>
                  </div>

                  {/* 세부 점수 바 */}
                  <div className="grid grid-cols-1 gap-3 pt-1 text-[11px] sm:grid-cols-3">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>🚇 역세권 유동성 지수:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {(rec.subway_commercial_trend_score * 10).toFixed(1)} /
                        10
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>💡 신규 기회 지표:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {(rec.category_opportunity_score * 10).toFixed(1)} / 10
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>📈 미충족 수요 비율:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {(rec.demand_gap_score * 10).toFixed(1)} / 10
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 하단 다시 테스트하기 버튼 */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => router.push("/example/two-tower-designs/design6")}
              className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-2.5 font-semibold text-slate-300 transition-colors hover:bg-slate-800"
            >
              🔄 테스트 다시하기
            </Button>
          </div>
        </div>
      </div>

      {/* 커스텀 토스트 알림 컴포넌트 */}
      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 flex animate-in items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-xs font-semibold text-slate-200 shadow-2xl backdrop-blur-md duration-300 fade-in slide-in-from-bottom-4">
          <span className="text-violet-400">💡</span>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
