"use client"

import { useState } from "react"
import { Check, ChevronLeft, ChevronRight, Play } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Progress } from "@/shared/components/ui/progress"
import { CATEGORY_OPTIONS, QUESTIONS } from "../_fixtures/mockData"

interface SurveyWizardProps {
  onComplete: (
    answers: Record<string, string | string[]>,
    categoryCode: string
  ) => void
}

/**
 * 창업 성향 분석을 위한 단계별 설문 마법사 컴포넌트
 */
export function SurveyWizard({ onComplete }: SurveyWizardProps) {
  // 현재 설문 단계 (0: 업종 선택, 1~10: 질문지 문항)
  const [currentStep, setCurrentStep] = useState(0)

  // 선택한 업종 코드 상태
  const [selectedCategory, setSelectedCategory] = useState<string>("")

  // 설문 응답 값 상태 (key: qId, value: 선택된 옵션 코드 또는 복수 선택의 경우 배열)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})

  const totalSteps = QUESTIONS.length + 1 // 업종 선택 + 10개 질문 = 총 11단계
  const progressPercent = Math.round((currentStep / (totalSteps - 1)) * 100)

  // 다음 단계 이동 처리
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  // 이전 단계 이동 처리
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // 단일 선택형 답변 핸들러
  const handleSingleSelect = (questionId: string, optionCode: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionCode,
    }))
    // 선택 즉시 자연스럽게 다음 질문으로 유도 (다소 빠른 전개)
    setTimeout(() => {
      handleNext()
    }, 300)
  }

  // 다중 선택형 답변 핸들러 (최대 3개 제한)
  const handleMultiSelect = (
    questionId: string,
    optionCode: string,
    maxSelections: number
  ) => {
    const currentAnswers = (answers[questionId] as string[]) || []

    let nextAnswers: string[]
    if (currentAnswers.includes(optionCode)) {
      nextAnswers = currentAnswers.filter((code) => code !== optionCode)
    } else {
      if (currentAnswers.length >= maxSelections) {
        // 최대 선택 개수 초과 시 추가하지 않음
        return
      }
      nextAnswers = [...currentAnswers, optionCode]
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: nextAnswers,
    }))
  }

  // 최종 설문 완료 핸들러
  const handleSubmit = () => {
    if (!selectedCategory) return
    onComplete(answers, selectedCategory)
  }

  // 현재 단계가 유효한지 확인 (다음 단계 버튼 활성화 제어)
  const isStepValid = () => {
    if (currentStep === 0) {
      return !!selectedCategory
    }

    const currentQuestion = QUESTIONS[currentStep - 1]
    const answer = answers[currentQuestion.id]

    if (currentQuestion.type === "single") {
      return !!answer
    } else {
      return Array.isArray(answer) && answer.length > 0
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* 설문 진행률 헤더 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
          <span>성향 진단 진행률</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {progressPercent}% ({currentStep}/{totalSteps - 1})
          </span>
        </div>
        <Progress
          value={progressPercent}
          className="h-2 bg-slate-100 dark:bg-slate-800"
        />
      </div>

      <Card className="overflow-hidden border-0 bg-white/70 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:bg-slate-900/70">
        {/* 단계 0: 업종 선택 화면 */}
        {currentStep === 0 && (
          <>
            <CardHeader className="space-y-2 pb-6">
              <div className="inline-flex">
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 dark:text-emerald-400"
                >
                  Step 1. 관심 업종 선택
                </Badge>
              </div>
              <CardTitle className="text-2xl leading-snug font-bold tracking-tight text-slate-800 dark:text-white">
                어떤 종류의 창업을 계획하고 계신가요?
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                설문 기반의 알고리즘이 매칭해 줄 추천 상권에 기준이 될 선호
                업종을 선택해 주세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pb-8">
              {CATEGORY_OPTIONS.map((option) => {
                const isSelected = selectedCategory === option.code
                return (
                  <button
                    key={option.code}
                    onClick={() => {
                      setSelectedCategory(option.code)
                      setTimeout(() => handleNext(), 250)
                    }}
                    className={`flex items-center justify-between rounded-2xl border p-5 text-left transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20"
                        : "border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    }`}
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {option.label}
                    </span>
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {isSelected && <Check className="h-4 w-4" />}
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </>
        )}

        {/* 단계 1~10: 질문지 문항 */}
        {currentStep > 0 &&
          currentStep <= QUESTIONS.length &&
          (() => {
            const question = QUESTIONS[currentStep - 1]
            const isMulti = question.type === "multi"
            const maxSelections = question.max_selections ?? 1
            const selectedValue = answers[question.id]

            return (
              <>
                <CardHeader className="space-y-2 pb-6">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 dark:text-emerald-400"
                    >
                      문항 {currentStep} / {QUESTIONS.length}
                    </Badge>
                    {isMulti && (
                      <Badge
                        variant="secondary"
                        className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      >
                        다중 선택 가능 (최대 {maxSelections}개)
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl leading-snug font-bold tracking-tight text-slate-800 dark:text-white">
                    {question.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 pb-8">
                  {question.options.map((option) => {
                    let isSelected = false
                    if (isMulti) {
                      isSelected =
                        Array.isArray(selectedValue) &&
                        selectedValue.includes(option.code)
                    } else {
                      isSelected = selectedValue === option.code
                    }

                    return (
                      <button
                        key={option.code}
                        onClick={() => {
                          if (isMulti) {
                            handleMultiSelect(
                              question.id,
                              option.code,
                              maxSelections
                            )
                          } else {
                            handleSingleSelect(question.id, option.code)
                          }
                        }}
                        className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20 dark:bg-emerald-950/20"
                            : "border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-bold transition-all duration-200 ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {option.code}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {option.label}
                          </span>
                        </div>

                        {isMulti && (
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded transition-all duration-200 ${
                              isSelected
                                ? "bg-emerald-500 text-white"
                                : "border border-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </CardContent>
              </>
            )
          })()}

        {/* 액션 컨트롤 풋터 */}
        <CardFooter className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-6 py-4 dark:border-slate-800/80 dark:bg-slate-900/20">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="text-slate-500 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            이전
          </Button>

          {currentStep === totalSteps - 1 ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isStepValid()}
              className="bg-emerald-600 px-6 font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
            >
              진단 완료
              <Play className="ml-1.5 h-4 w-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid()}
              className="bg-slate-800 px-5 font-semibold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              다음
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
