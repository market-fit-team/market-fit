"use client"

/**
 * Design8 설문 페이지
 * - Claude Opus 4.6 (Thinking) 모델 기반 디자인 (design4 개선판)
 * - 데스크톱: 적절한 max-w-xl 중앙 정렬 + 좌우 여백
 * - 모바일: 풀 화면 편안한 레이아웃
 * - 레이아웃 시프트 방지: 문항 영역 고정 높이 + key 기반 리렌더
 * - API 연동 없이 목 데이터만 사용
 */
import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { QuestionCard } from "./_components/question-card"
import { SurveyProgress } from "./_components/survey-progress"
import { MOCK_SURVEY } from "./_fixtures/survey-data"
import type { SurveyAnswers } from "./_fixtures/types"

export default function Design8SurveyPage() {
  const router = useRouter()

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [direction, setDirection] = useState<"enter" | "exit" | "idle">("enter")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const questions = MOCK_SURVEY.questions
  const currentQ = questions[step]
  const totalSteps = questions.length

  const hasAnswer = useMemo(() => {
    const ans = answers[currentQ.id]
    if (!ans) return false
    if (Array.isArray(ans)) return ans.length > 0
    return true
  }, [answers, currentQ.id])

  const handleAnswer = useCallback(
    (questionId: string, value: string | string[]) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }))
    },
    []
  )

  const goNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setDirection("exit")
      setTimeout(() => {
        setStep((s) => s + 1)
        setDirection("enter")
      }, 200)
    }
  }, [step, totalSteps])

  const goPrev = useCallback(() => {
    if (step > 0) {
      setDirection("exit")
      setTimeout(() => {
        setStep((s) => s - 1)
        setDirection("enter")
      }, 200)
    }
  }, [step])

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true)
    setTimeout(() => {
      router.push("/example/two-tower-designs/design8/mock-result")
    }, 1200)
  }, [router])

  /** 단일 선택 시 자동 진행 */
  const handleAutoAdvance = useCallback(
    (questionId: string, value: string | string[]) => {
      handleAnswer(questionId, value)
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
      {/* 제출 로딩 오버레이 */}
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

      {/* 메인 컨테이너 — 데스크톱에서 적절한 너비 */}
      <div className="mx-auto flex min-h-screen max-w-xl flex-col px-5 py-8 md:px-8 md:py-12">
        {/* 헤더 */}
        <header className="mb-8 space-y-2">
          <h1 className="text-xl font-bold text-foreground md:text-2xl">
            {MOCK_SURVEY.title}
          </h1>
          <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
            나에게 맞는 창업 상권을 찾기 위한 간단한 설문입니다.
            <br />
            편하게 답변해 주세요.
          </p>
        </header>

        {/* 진행률 */}
        <SurveyProgress current={step} total={totalSteps} />

        {/* 문항 영역 — 고정 최소 높이로 레이아웃 시프트 방지 */}
        <div className="mt-8 flex-1" style={{ minHeight: 360 }}>
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
            size="lg"
            onClick={goPrev}
            disabled={step === 0}
            className="flex-1"
          >
            ← 이전
          </Button>

          {isLastStep ? (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!hasAnswer || isSubmitting}
              className="flex-[2]"
            >
              결과 보기
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={goNext}
              disabled={!hasAnswer}
              className="flex-[2]"
            >
              다음 →
            </Button>
          )}
        </nav>
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
