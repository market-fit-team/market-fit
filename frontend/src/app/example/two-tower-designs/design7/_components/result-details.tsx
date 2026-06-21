"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { CATEGORIES, type FullSurveyResult } from "../_fixtures/mockData"

interface ResultDetailsProps {
  data: FullSurveyResult
  theme: "light" | "dark"
}

export function ResultDetails({ data, theme }: ResultDetailsProps) {
  const router = useRouter()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState<boolean>(
    data.profile.auth_user_uuid !== null
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
      const shareUrl = `${window.location.origin}/example/two-tower-designs/design7/${profile.profile_code}`
      try {
        await navigator.clipboard.writeText(shareUrl)
        showToast("결과 공유 링크가 클립보드에 복사되었습니다.")
      } catch {
        showToast("링크 복사에 실패했습니다.")
      }
    }
  }

  // 가상의 로그인 결과 저장 기능 (PUT /surveys/me/profile 시뮬레이션)
  const handleSaveResult = () => {
    if (isSaved) {
      showToast("이미 내 보관함에 저장된 설문 결과입니다.")
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
    showToast("설문 분석 결과가 회원 계정에 저장되었습니다.")
  }

  // 프로필 지표 리스트 매핑
  const profileMetrics = [
    {
      label: "투자 규모 선호",
      val: user_profile.budget_level,
      desc: "높을수록 대규모 초기 투자 선호",
    },
    {
      label: "안정성 지향도",
      val: user_profile.stability_level,
      desc: "높을수록 안정적 유지 중시",
    },
    {
      label: "지하철역 의존도",
      val: user_profile.subway_dependency_level,
      desc: "높을수록 역세권 중심지 중시",
    },
    {
      label: "주말 영업 선호",
      val: user_profile.weekend_preference_level,
      desc: "높을수록 주말 유동 중심 상권",
    },
    {
      label: "저녁 영업 선호",
      val: user_profile.evening_preference_level,
      desc: "높을수록 저녁/야간 시간 상권",
    },
    {
      label: "상주 주민 집중도",
      val: user_profile.resident_focus_level,
      desc: "높을수록 주거 단지 인근 상권",
    },
    {
      label: "직장인 집중도",
      val: user_profile.worker_focus_level,
      desc: "높을수록 사무실 밀집 구역 상권",
    },
    {
      label: "임대료 민감도",
      val: user_profile.rent_sensitivity_level,
      desc: "높을수록 초기 유지 비용 최소화",
    },
    {
      label: "경쟁 수용도",
      val: user_profile.competition_tolerance_level,
      desc: "높을수록 대형 핵심 상권 지향",
    },
  ]

  // 상권 프로필 타입 라벨 매핑
  const getAreaProfileLabel = (
    type: "residential" | "office" | "subway" | "mixed"
  ) => {
    switch (type) {
      case "residential":
        return "주거 중심"
      case "office":
        return "오피스 중심"
      case "subway":
        return "역세권 유동"
      case "mixed":
        return "복합 상권"
      default:
        return "상권"
    }
  }

  // 매출 포맷터
  const formatSalesAmount = (amount: number): string => {
    const eok = amount / 100000000
    return `${eok.toFixed(1)}억원`
  }

  return (
    <div
      className={`${theme} mx-auto w-full max-w-4xl px-6 py-12 transition-colors duration-200`}
    >
      <div className="space-y-8">
        {/* 헤더 섹션 */}
        <div className="flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end dark:border-zinc-800">
          <div className="space-y-2">
            <span className="inline-flex items-center text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
              AI Two-Tower Recommendation Report
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {user_profile.profile_name}님의 상권 매칭 결과
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              공유 분석 코드:{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono font-bold text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100">
                {profile.profile_code}
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="h-10 rounded-lg border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              공유 링크 복사
            </Button>
            <Button
              onClick={handleSaveResult}
              className={`h-10 rounded-lg border-none px-4 text-xs font-bold transition-all ${
                isSaved
                  ? "cursor-default bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  : "bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              }`}
            >
              {isSaved ? "저장 완료" : "내 보관함에 저장"}
            </Button>
          </div>
        </div>

        {/* 2컬럼 레이아웃 */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
          {/* 왼쪽 1컬럼: 창업 성향 지표 목록 */}
          <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-none lg:col-span-1 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <h2 className="text-xs font-bold tracking-wider text-zinc-800 uppercase dark:text-zinc-200">
                창업 성향 지표 (Vector Profile)
              </h2>
              <p className="mt-1 text-[11px] leading-normal text-zinc-400 dark:text-zinc-500">
                설문 응답 성향을 정밀 가공하여 추출한 9가지 분석 지표입니다.
              </p>
            </div>

            {/* 선호 업종 카드 */}
            <div className="border-zinc-150 flex items-center gap-3.5 rounded-lg border bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/30">
              <span className="text-2xl">{category?.emoji}</span>
              <div>
                <span className="block text-[9px] font-bold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                  진단 업종
                </span>
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-200">
                  {category?.name}
                </span>
              </div>
            </div>

            {/* 9대 성향 지표 슬라이더 목록 */}
            <div className="space-y-4 pt-1">
              {profileMetrics.map((metric) => (
                <div key={metric.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {metric.label}
                    </span>
                    <span className="font-black text-zinc-900 dark:text-zinc-50">
                      {(metric.val * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100"
                      style={{ width: `${metric.val * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {metric.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽 2컬럼: 추천 상권 리스트 */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h2 className="text-xs font-bold tracking-wider text-zinc-800 uppercase dark:text-zinc-200">
                AI 매칭 추천 상권 TOP 5
              </h2>
              <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                유사도 스코어 순
              </span>
            </div>

            <div className="space-y-4">
              {prediction.recommendations.map((rec) => (
                <div
                  key={rec.rank}
                  className="group rounded-xl border border-zinc-200 bg-white p-6 transition-all duration-300 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                >
                  <div className="flex items-start gap-4">
                    {/* 미니멀한 랭크 번호 */}
                    <div className="flex size-7 items-center justify-center rounded border border-zinc-900 bg-white text-xs font-black text-zinc-950 dark:border-zinc-100 dark:bg-zinc-950 dark:text-zinc-50">
                      {rec.rank}
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* 타이틀 및 스코어 */}
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-md font-bold text-zinc-900 transition-colors group-hover:text-zinc-950 dark:text-zinc-50 dark:group-hover:text-white">
                              서울 {rec.area_name}
                            </h3>
                            <span className="rounded border border-zinc-200/20 bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              {getAreaProfileLabel(rec.area_profile_type)}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                            추천 업종:{" "}
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                              {rec.service_category_name}
                            </span>
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="block text-[9px] tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                            매칭 스코어
                          </span>
                          <span className="font-mono text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                            {rec.score.toFixed(4)}
                          </span>
                        </div>
                      </div>

                      {/* 핵심 요약 데이터 수치 테이블 */}
                      <div className="grid grid-cols-2 gap-3 border-t border-zinc-50 pt-1 sm:grid-cols-5 dark:border-zinc-800/40">
                        <div>
                          <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
                            평균 연 매출
                          </span>
                          <span className="mt-0.5 block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {formatSalesAmount(rec.sales_amount)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
                            상주 인구수
                          </span>
                          <span className="mt-0.5 block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {rec.resident_population.toLocaleString()}명
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
                            직장인 수
                          </span>
                          <span className="mt-0.5 block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {rec.worker_population.toLocaleString()}명
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
                            주말 매출 비율
                          </span>
                          <span className="mt-0.5 block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {Math.round(rec.weekend_sales_ratio * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-400 dark:text-zinc-500">
                            저녁 매출 비율
                          </span>
                          <span className="mt-0.5 block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {Math.round(rec.evening_sales_ratio * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* 미니 세부 스코어바 */}
                      <div className="grid grid-cols-1 gap-4 pt-1 text-[11px] text-zinc-500 sm:grid-cols-3 dark:text-zinc-400">
                        <div className="flex items-center justify-between border-t border-zinc-50 pt-2 dark:border-zinc-800/40">
                          <span>역세권 활성 지수</span>
                          <span className="font-mono font-extrabold text-zinc-800 dark:text-zinc-200">
                            {(rec.subway_commercial_trend_score * 10).toFixed(
                              1
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-50 pt-2 dark:border-zinc-800/40">
                          <span>카테고리 기회 지표</span>
                          <span className="font-mono font-extrabold text-zinc-800 dark:text-zinc-200">
                            {(rec.category_opportunity_score * 10).toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-50 pt-2 dark:border-zinc-800/40">
                          <span>미충족 수요 비율</span>
                          <span className="font-mono font-extrabold text-zinc-800 dark:text-zinc-200">
                            {(rec.demand_gap_score * 10).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 다시 테스트하기 버튼 */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={() =>
                  router.push("/example/two-tower-designs/design7")
                }
                className="rounded-lg border border-zinc-200 bg-white px-6 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                진단 다시 시작하기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 토스트 컴포넌트 */}
      {toastMessage && (
        <div className="fixed right-6 bottom-6 z-50 flex animate-in items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs font-semibold text-zinc-800 shadow-sm duration-250 fade-in slide-in-from-bottom-4 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          <span>✓</span>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
