"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import {
  CATEGORIES,
  QUESTIONS,
  buildFullSurveyResult,
} from "../_fixtures/mockData"

interface SurveyWizardProps {
  theme: "light" | "dark"
}

export function SurveyWizard({ theme }: SurveyWizardProps) {
  const router = useRouter()

  // 설문 상태 관리
  // -1: 이름 및 선호 업종 선택
  // 0 ~ 9: 설문 질문 (q1 ~ q10)
  // 10: 상권 추천 알고리즘 로딩 및 연산 단계
  const [step, setStep] = useState<number>(-1)
  const [userName, setUserName] = useState<string>("")
  const [selectedCategory, setSelectedCategory] = useState<string>("CS100005") // 기본값: 제과점
  const [answers, setAnswers] = useState<{ [qId: string]: string | string[] }>(
    {}
  )

  // 로딩 화면 연출 상태
  const [loadingProgress, setLoadingProgress] = useState<number>(0)
  const [loadingText, setLoadingText] = useState<string>("상권 정보 수집 중...")

  // 랜덤한 16자리 소문자/숫자 공유 코드 생성 함수
  const generateProfileCode = (): string => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    let code = "r" // r로 시작하도록 고정 (요청응답 예시와 유사하게)
    for (let i = 0; i < 15; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // 싱글 선택 문항 처리
  const handleSingleSelect = (questionId: string, optionCode: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionCode }))

    // 선택 후 300ms 후에 자동으로 다음 질문으로 슬라이드 (사용자 반응성)
    setTimeout(() => {
      setStep((prev) => prev + 1)
    }, 300)
  }

  // 멀티 선택 문항 처리 (Q10 전용)
  const handleMultiSelect = (questionId: string, optionCode: string) => {
    const currentSelections = (answers[questionId] as string[]) || []
    let nextSelections: string[]

    if (currentSelections.includes(optionCode)) {
      nextSelections = currentSelections.filter((c) => c !== optionCode)
    } else {
      if (currentSelections.length >= 3) {
        return
      }
      nextSelections = [...currentSelections, optionCode]
    }

    setAnswers((prev) => ({ ...prev, [questionId]: nextSelections }))
  }

  // 설문 완료 및 로딩 시작
  const handleCompleteSurvey = () => {
    setStep(10) // 로딩 단계 진입
  }

  // 로딩 과정 연출 및 최종 결과 페이지 이동
  useEffect(() => {
    if (step !== 10) return

    const texts = [
      "서울시 140여 개 주요 상권 데이터베이스 로드 중...",
      "희망 업종 경쟁률 및 매출 분포 가중치 계산 중...",
      "투타워(Two-Tower) 매칭 벡터 유사도 점수 산출 중...",
      "추천 후보 상권 Top 5 및 프로필 지표 생성 중...",
      "분석 완료! 상권 추천 결과를 가져옵니다.",
    ]

    let progress = 0
    const interval = setInterval(() => {
      progress += 5
      setLoadingProgress(progress)

      // 진행률에 따라 로딩 텍스트 변경
      const textIdx = Math.min(Math.floor(progress / 20), texts.length - 1)
      setLoadingText(texts[textIdx])

      if (progress >= 100) {
        clearInterval(interval)

        // 결과 저장 및 페이지 이동
        const profileCode = generateProfileCode()
        const finalResult = buildFullSurveyResult(
          profileCode,
          selectedCategory,
          userName || "예비 창업자",
          answers,
          null, // 비회원 기본
          "survey"
        )

        // LocalStorage에 추천 결과 저장 (동적 조회 가능하도록 지원)
        localStorage.setItem(
          `survey_res_${profileCode}`,
          JSON.stringify(finalResult)
        )

        // 결과 상세 페이지로 라우팅
        router.push(`/example/two-tower-designs/design7/${profileCode}`)
      }
    }, 120)

    return () => clearInterval(interval)
  }, [step, answers, selectedCategory, userName, router])

  // 현재 질문 정보
  const currentQuestion = QUESTIONS[step]

  return (
    <div
      className={`${theme} mx-auto w-full max-w-3xl px-6 py-12 transition-colors duration-200`}
    >
      {/* 메인 설문 카드 (미니멀 Zinc 디자인) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition-all duration-300 md:p-12 dark:border-zinc-800 dark:bg-zinc-900">
        {/* 단계 -1: 사용자 정보 및 업종 선택 */}
        {step === -1 && (
          <div className="space-y-8">
            <div className="space-y-3">
              <span className="inline-flex items-center text-[10px] font-black tracking-widest text-zinc-400 uppercase dark:text-zinc-500">
                Design 7 / Zinc Minimalist
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                창업 상향 추천 진단
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                예비 대표님의 성향과 선호 업종을 파악하여 인공지능 투타워
                알고리즘을 기반으로 서울 최적의 추천 상권 Top 5를 매칭해
                드립니다.
              </p>
            </div>

            <div className="space-y-6 pt-2">
              {/* 이름 입력 */}
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  대표님의 성함 또는 닉네임
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="예비 대표님"
                  className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                />
              </div>

              {/* 업종 선택 */}
              <div className="space-y-3">
                <label className="text-xs font-bold tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  창업 희망 업종 선택
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => setSelectedCategory(cat.code)}
                      className={`flex items-start gap-3.5 rounded-lg border p-4 text-left transition-all ${
                        selectedCategory === cat.code
                          ? "border-zinc-950 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-100 dark:text-zinc-950"
                          : "border-zinc-200 bg-zinc-50/50 text-zinc-500 hover:bg-zinc-100/50 dark:border-zinc-800/80 dark:bg-zinc-950/40 dark:text-zinc-400 dark:hover:bg-zinc-800/30"
                      }`}
                    >
                      <span className="mt-0.5 text-xl">{cat.emoji}</span>
                      <div>
                        <div
                          className={`text-sm font-bold ${selectedCategory === cat.code ? "text-zinc-50 dark:text-zinc-950" : "text-zinc-800 dark:text-zinc-200"}`}
                        >
                          {cat.name}
                        </div>
                        <div
                          className={`mt-0.5 text-[11px] ${selectedCategory === cat.code ? "text-zinc-300 dark:text-zinc-600" : "text-zinc-400 dark:text-zinc-500"}`}
                        >
                          {cat.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-6 dark:border-zinc-800">
              <Button
                onClick={() => setStep(0)}
                className="h-11 w-full rounded-lg border-none bg-zinc-900 font-bold text-zinc-50 transition-all hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                진단 시작
              </Button>
            </div>
          </div>
        )}

        {/* 단계 0 ~ 9: 설문 질문 응답 진행 */}
        {step >= 0 && step < 10 && (
          <div className="space-y-8">
            {/* 상단 프로그레스 헤더 */}
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider text-zinc-400">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStep((prev) => prev - 1)}
                  className="-ml-1 rounded-md p-1 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label="이전 질문으로 이동"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span>질문 {step + 1} / 10</span>
              </div>
              <span>{Math.round(((step + 1) / 10) * 100)}%</span>
            </div>

            {/* 프로그레스 바 */}
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-100"
                style={{ width: `${((step + 1) / 10) * 100}%` }}
              />
            </div>

            {/* 질문 타이틀 */}
            <div className="space-y-1.5">
              <h2 className="text-xl leading-snug font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.selection_type === "multi" && (
                <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  대표님이 가장 중요시하는 가치를 최대 3개까지 선택할 수
                  있습니다.
                </p>
              )}
            </div>

            {/* 옵션 목록 */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt) => {
                const isSelected =
                  currentQuestion.selection_type === "single"
                    ? answers[currentQuestion.id] === opt.code
                    : (
                        (answers[currentQuestion.id] as string[]) || []
                      ).includes(opt.code)

                return (
                  <button
                    key={opt.code}
                    onClick={() =>
                      currentQuestion.selection_type === "single"
                        ? handleSingleSelect(currentQuestion.id, opt.code)
                        : handleMultiSelect(currentQuestion.id, opt.code)
                    }
                    className={`flex w-full items-center justify-between rounded-lg border p-4 text-left transition-all ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-100/50 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-800/40 dark:text-zinc-50"
                        : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex size-5.5 items-center justify-center rounded border text-[11px] font-black transition-colors ${
                          isSelected
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950"
                            : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600"
                        }`}
                      >
                        {opt.code}
                      </span>
                      <span
                        className={`text-sm font-semibold ${isSelected ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-700 dark:text-zinc-300"}`}
                      >
                        {opt.label}
                      </span>
                    </div>

                    {/* 심플 체크 아이콘 */}
                    {isSelected && (
                      <span className="text-zinc-900 dark:text-zinc-50">
                        <svg
                          className="size-4.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* 하단 제어 바 */}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-6 dark:border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => setStep((prev) => prev - 1)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                이전
              </Button>

              {currentQuestion.selection_type === "multi" ? (
                <Button
                  onClick={handleCompleteSurvey}
                  disabled={
                    !answers[currentQuestion.id] ||
                    (answers[currentQuestion.id] as string[]).length === 0
                  }
                  className="rounded-lg bg-zinc-900 px-6 py-2 font-bold text-zinc-50 shadow-none hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  결과 확인
                </Button>
              ) : (
                <Button
                  onClick={() => setStep((prev) => prev + 1)}
                  disabled={!answers[currentQuestion.id]}
                  className="dark:bg-zinc-850 rounded-lg bg-zinc-100 px-6 py-2 font-bold text-zinc-800 hover:bg-zinc-200 disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  다음
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 단계 10: AI 추천 연산 중 시뮬레이션 */}
        {step === 10 && (
          <div className="space-y-8 py-10 text-center">
            {/* 미니멀한 라인 형태의 스피너 */}
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-zinc-200 dark:border-zinc-800" />
              <div className="absolute inset-0 animate-spin rounded-full border-t border-zinc-900 dark:border-zinc-100" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
                {loadingText}
              </h3>
              <p className="mx-auto max-w-sm text-xs text-zinc-400 dark:text-zinc-500">
                선택하신 업종과 대표님의 성향을 매핑하여 서울시 상권 데이터를
                필터링하고 있습니다.
              </p>
            </div>

            {/* 진행도 게이지 */}
            <div className="mx-auto max-w-xs space-y-2">
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full bg-zinc-900 transition-all duration-150 dark:bg-zinc-100"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400">
                {loadingProgress}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
