"use client"

/**
 * Design4 설문 페이지
 * - Claude Opus 4.6 (Thinking) 모델 기반 디자인
 * - 카드 덱 슬라이드 방식으로 10문항을 순차 진행
 * - 완료 시 design4/[res] 결과 페이지로 네비게이션
 * - API 연동 없이 목 데이터만 사용
 */
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { QuestionCard } from "./_components/question-card"
import { SurveyProgress } from "./_components/survey-progress"
import { MOCK_SURVEY } from "./_fixtures/survey-data"
import type { SurveyAnswers } from "./_fixtures/types"

export default function Design4SurveyPage() {
  const router = useRouter()

  /** 현재 문항 인덱스 */
  const [step, setStep] = useState(0)
  /** 전체 응답 */
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  /** 카드 전환 애니메이션 방향 */
  const [direction, setDirection] = useState<"enter" | "exit" | "idle">("enter")
  /** 제출 중 상태 */
  const [isSubmitting, setIsSubmitting] = useState(false)

  const questions = MOCK_SURVEY.questions
  const currentQ = questions[step]
  const totalSteps = questions.length

  /** 현재 문항에 답변이 있는지 확인 */
  const hasAnswer = useMemo(() => {
    const ans = answers[currentQ.id]
    if (!ans) return false
    if (Array.isArray(ans)) return ans.length > 0
    return true
  }, [answers, currentQ.id])

  /** 답변 선택 핸들러 */
  const handleAnswer = useCallback(
    (questionId: string, value: string | string[]) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }))
    },
    []
  )

  /** 다음 문항으로 이동 */
  const goNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setDirection("exit")
      setTimeout(() => {
        setStep((s) => s + 1)
        setDirection("enter")
      }, 200)
    }
  }, [step, totalSteps])

  /** 이전 문항으로 이동 */
  const goPrev = useCallback(() => {
    if (step > 0) {
      setDirection("exit")
      setTimeout(() => {
        setStep((s) => s - 1)
        setDirection("enter")
      }, 200)
    }
  }, [step])

  /** 설문 제출 (목 데이터이므로 결과 페이지로 라우팅) */
  const handleSubmit = useCallback(() => {
    setIsSubmitting(true)
    // 목 데이터이므로 딜레이 후 결과 페이지로 이동
    setTimeout(() => {
      router.push("/example/two-tower-designs/design4/mock-result")
    }, 1200)
  }, [router])

  /** 단일 선택 문항은 선택 즉시 자동 진행 */
  const handleAutoAdvance = useCallback(
    (questionId: string, value: string | string[]) => {
      handleAnswer(questionId, value)

      // 단일 선택이고 마지막 문항이 아니면 자동으로 다음으로
      if (
        currentQ.selection_type === "single" &&
        typeof value === "string" &&
        step < totalSteps - 1
      ) {
        setTimeout(() => goNext(), 400)
      }
    },
    [handleAnswer, currentQ.selection_type, step, totalSteps, goNext]
  )

  const isLastStep = step === totalSteps - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* 제출 중 오버레이 */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex animate-in flex-col items-center gap-4 duration-300 fade-in zoom-in">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
            </div>
            <p className="text-sm text-muted-foreground">분석 중입니다...</p>
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
        {/* 헤더 */}
        <header className="mb-8 space-y-2">
          <h1 className="text-xl font-bold text-foreground">
            {MOCK_SURVEY.title}
          </h1>
          <p className="text-xs leading-relaxed text-muted-foreground">
            나에게 맞는 창업 상권을 찾기 위한 간단한 설문입니다.
            <br />
            편하게 답변해 주세요.
          </p>
        </header>

        {/* 진행률 */}
        <SurveyProgress current={step} total={totalSteps} />

        {/* 문항 카드 영역 */}
        <div className="mt-8 flex-1">
          <QuestionCard
            key={currentQ.id}
            question={currentQ}
            answer={answers[currentQ.id]}
            onAnswer={handleAutoAdvance}
            direction={direction}
          />
        </div>

        {/* 하단 네비게이션 */}
        <nav className="mt-8 flex items-center gap-3 border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            onClick={goPrev}
            disabled={step === 0}
            className="flex-1"
          >
            ← 이전
          </Button>

          {isLastStep ? (
            <Button
              onClick={handleSubmit}
              disabled={!hasAnswer || isSubmitting}
              className="flex-[2] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              결과 보기 ✨
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!hasAnswer} className="flex-[2]">
              다음 →
            </Button>
          )}
        </nav>
      </div>

      {/* 커스텀 애니메이션 keyframes */}
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
