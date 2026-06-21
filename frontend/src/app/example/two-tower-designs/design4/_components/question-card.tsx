"use client"

/**
 * 카드 덱 스타일 설문 문항 컴포넌트
 * 슬라이드 전환 애니메이션과 함께 각 문항을 카드 형태로 보여준다.
 * single: 하나만 선택, multi: 최대 max_selections개 선택
 */
import { useCallback } from "react"
import { Checkbox } from "@/shared/components/ui/checkbox"
import type { SurveyQuestion } from "../_fixtures/types"

interface QuestionCardProps {
  /** 현재 표시할 문항 */
  question: SurveyQuestion
  /** 현재 선택된 값 */
  answer: string | string[] | undefined
  /** 선택 변경 콜백 */
  onAnswer: (questionId: string, value: string | string[]) => void
  /** 카드 전환 방향 (CSS 애니메이션용) */
  direction: "enter" | "exit" | "idle"
}

export function QuestionCard({
  question,
  answer,
  onAnswer,
  direction,
}: QuestionCardProps) {
  const isSingle = question.selection_type === "single"

  /** 단일 선택 핸들러 */
  const handleSingleSelect = useCallback(
    (code: string) => {
      onAnswer(question.id, code)
    },
    [onAnswer, question.id]
  )

  /** 다중 선택 핸들러 */
  const handleMultiToggle = useCallback(
    (code: string) => {
      const current = Array.isArray(answer) ? answer : []
      const maxSel = question.max_selections ?? Infinity

      if (current.includes(code)) {
        onAnswer(
          question.id,
          current.filter((c) => c !== code)
        )
      } else if (current.length < maxSel) {
        onAnswer(question.id, [...current, code])
      }
    },
    [answer, onAnswer, question.id, question.max_selections]
  )

  /** 현재 선택된 코드인지 확인 */
  const isSelected = (code: string) => {
    if (isSingle) return answer === code
    return Array.isArray(answer) && answer.includes(code)
  }

  /** CSS 애니메이션 클래스 */
  const animClass =
    direction === "enter"
      ? "animate-in fade-in slide-in-from-right-8 duration-400"
      : direction === "exit"
        ? "animate-out fade-out slide-out-to-left-8 duration-300"
        : ""

  return (
    <div className={`flex flex-col gap-6 ${animClass}`}>
      {/* 질문 텍스트 */}
      <div className="space-y-2">
        <h2 className="text-lg leading-relaxed font-semibold text-foreground">
          {question.prompt}
        </h2>
        {!isSingle && question.max_selections && (
          <p className="text-xs text-muted-foreground">
            최대 {question.max_selections}개까지 선택할 수 있어요
          </p>
        )}
      </div>

      {/* 선택지 목록 */}
      <div className="flex flex-col gap-3">
        {question.options.map((opt, idx) => {
          const selected = isSelected(opt.code)

          return (
            <button
              key={opt.code}
              type="button"
              onClick={() =>
                isSingle
                  ? handleSingleSelect(opt.code)
                  : handleMultiToggle(opt.code)
              }
              className={`group relative flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all duration-200 ease-out ${
                selected
                  ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm"
              } `}
              style={{
                animationDelay: `${idx * 60}ms`,
                animation:
                  direction === "enter"
                    ? `fadeInUp 0.4s ease-out ${idx * 60}ms both`
                    : undefined,
              }}
            >
              {/* 선택 인디케이터 */}
              {isSingle ? (
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                    selected
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30 group-hover:border-primary/50"
                  }`}
                >
                  {selected && (
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              ) : (
                <Checkbox
                  checked={selected}
                  className="pointer-events-none"
                  aria-hidden
                />
              )}

              {/* 선택지 라벨 */}
              <span
                className={`flex-1 transition-colors duration-200 ${
                  selected
                    ? "font-medium text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                {opt.label}
              </span>

              {/* 선택 시 체크 아이콘 */}
              {selected && (
                <svg
                  className="h-4 w-4 shrink-0 animate-in text-primary duration-200 zoom-in"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
