"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import {
  CATEGORIES,
  QUESTIONS,
  buildFullSurveyResult,
} from "../_fixtures/mockData"

export function SurveyWizard() {
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
        // 최대 3개 선택 제한 알림
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
        router.push(`/example/two-tower-designs/design6/${profileCode}`)
      }
    }, 120)

    return () => clearInterval(interval)
  }, [step, answers, selectedCategory, userName, router])

  // 현재 질문 정보
  const currentQuestion = QUESTIONS[step]

  return (
    <div className="relative mx-auto w-full max-w-2xl px-4 py-8">
      {/* 백그라운드 퍼플/블루 글로우 구체 */}
      <div className="pointer-events-none absolute -top-12 -left-12 -z-10 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-12 -bottom-12 -z-10 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />

      {/* 메인 설문 카드 (글래스모피즘) */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 md:p-10">
        {/* 단계 -1: 사용자 정보 및 업종 선택 */}
        {step === -1 && (
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
                ✨ Gemini 3.5 Flash 프리미엄 설문
              </span>
              <h1 className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-300 bg-clip-text text-2xl font-bold text-transparent md:text-3xl">
                창업 상향 추천 진단 (Design 6)
              </h1>
              <p className="mx-auto max-w-md text-sm text-slate-400">
                예비 대표님의 성향과 선호 업종을 파악하여 인공지능 투타워
                알고리즘을 기반으로 서울 최적의 추천 상권 Top 5를 매칭해
                드립니다.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              {/* 이름 입력 */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300">
                  예비 대표님의 이름(혹은 닉네임)을 알려주세요.
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="홍길동"
                  className="h-11 w-full rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-violet-500 focus:outline-none"
                />
              </div>

              {/* 업종 선택 */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-300">
                  창업을 희망하시는 업종을 하나 선택해 주세요.
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.code}
                      type="button"
                      onClick={() => setSelectedCategory(cat.code)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        selectedCategory === cat.code
                          ? "border-violet-500 bg-violet-600/10 text-slate-100 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                          : "border-slate-800/80 bg-slate-800/30 text-slate-400 hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="mt-0.5 text-2xl">{cat.emoji}</span>
                      <div>
                        <div
                          className={`text-sm font-semibold ${selectedCategory === cat.code ? "text-violet-300" : "text-slate-300"}`}
                        >
                          {cat.name}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {cat.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
              <Button
                onClick={() => setStep(0)}
                className="h-11 w-full rounded-xl border-none bg-gradient-to-r from-violet-600 to-indigo-600 font-bold text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)] transition-all hover:from-violet-500 hover:to-indigo-500"
              >
                진단 설문 시작하기
              </Button>
            </div>
          </div>
        )}

        {/* 단계 0 ~ 9: 설문 질문 응답 진행 */}
        {step >= 0 && step < 10 && (
          <div className="space-y-6">
            {/* 상단 프로그레스 헤더 */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep((prev) => prev - 1)}
                  className="-ml-1 rounded-lg p-1 transition-colors hover:bg-slate-800 hover:text-slate-200"
                  aria-label="이전 질문으로 이동"
                >
                  <svg
                    className="size-4"
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
                <span className="font-semibold text-violet-400">
                  질문 {step + 1} / 10
                </span>
              </div>
              <span className="font-semibold">
                {Math.round(((step + 1) / 10) * 100)}%
              </span>
            </div>

            {/* 프로그레스 바 */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                style={{ width: `${((step + 1) / 10) * 100}%` }}
              />
            </div>

            {/* 질문 타이틀 */}
            <div className="space-y-2">
              <h2 className="text-lg leading-snug font-bold text-slate-200 md:text-xl">
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.selection_type === "multi" && (
                <p className="text-xs font-medium text-slate-500">
                  * 대표님이 가장 중요시하는 가치를 최대 3개까지 선택할 수
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
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-violet-500 bg-gradient-to-r from-violet-950/20 to-indigo-950/20 text-slate-100 shadow-[0_0_12px_rgba(139,92,246,0.1)]"
                        : "border-slate-800/80 bg-slate-800/30 text-slate-400 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-6 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                          isSelected
                            ? "border-violet-400 bg-violet-600 text-white"
                            : "border-slate-700 bg-slate-900 text-slate-500"
                        }`}
                      >
                        {opt.code}
                      </span>
                      <span
                        className={`text-sm ${isSelected ? "font-semibold text-violet-300" : "text-slate-300"}`}
                      >
                        {opt.label}
                      </span>
                    </div>

                    {/* 선택 체크박스 아이콘 */}
                    {isSelected && (
                      <span className="text-violet-400">
                        <svg
                          className="size-5"
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
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <Button
                variant="ghost"
                onClick={() => setStep((prev) => prev - 1)}
                className="text-slate-400 hover:text-slate-200"
              >
                이전 문항
              </Button>

              {currentQuestion.selection_type === "multi" ? (
                <Button
                  onClick={handleCompleteSurvey}
                  disabled={
                    !answers[currentQuestion.id] ||
                    (answers[currentQuestion.id] as string[]).length === 0
                  }
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2 font-bold text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40"
                >
                  결과 보기
                </Button>
              ) : (
                <Button
                  onClick={() => setStep((prev) => prev + 1)}
                  disabled={!answers[currentQuestion.id]}
                  className="rounded-xl bg-slate-800 px-5 py-2 font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  다음 문항
                </Button>
              )}
            </div>
          </div>
        )}

        {/* 단계 10: AI 추천 연산 중 시뮬레이션 */}
        {step === 10 && (
          <div className="space-y-8 py-8 text-center">
            {/* 세련된 회전 스피너 & 서클 */}
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/10" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
              <span className="animate-bounce text-3xl">🤖</span>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-bold text-slate-200">
                {loadingText}
              </h3>
              <p className="mx-auto max-w-sm text-xs text-slate-500">
                선택하신{" "}
                {CATEGORIES.find((c) => c.code === selectedCategory)?.name ||
                  ""}{" "}
                업종에 맞춤화된 소상공인 기회 지수를 산출하고 있습니다.
              </p>
            </div>

            {/* 진행도 게이지 */}
            <div className="mx-auto max-w-md space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-150"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <span className="text-xs font-bold text-indigo-400">
                {loadingProgress}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
