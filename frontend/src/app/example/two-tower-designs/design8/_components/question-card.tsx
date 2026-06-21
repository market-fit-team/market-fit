"use client"

/**
 * 카드 덱 스타일 설문 문항 컴포넌트
 * 단일/다중 선택 대응, 선택지별 딜레이 애니메이션 포함.
 * 레이아웃 시프트 방지를 위해 선택지 영역에 minHeight를 부여한다.
 */
import { useCallback } from "react"
import { Checkbox } from "@/shared/components/ui/checkbox"
import type { SurveyQuestion } from "../_fixtures/types"

interface QuestionCardProps {
  question: SurveyQuestion
  answer: string | string[] | undefined
  onAnswer: (questionId: string, value: string | string[]) => void
  direction: "enter" | "exit" | "idle"
}

export function QuestionCard({
  question,
  answer,
  onAnswer,
  direction,
}: QuestionCardProps) {
  const isSingle = question.selection_type === "single"

  const handleSingleSelect = useCallback(
    (code: string) => {
      onAnswer(question.id, code)
    },
    [onAnswer, question.id]
  )

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

  const isSelected = (code: string) => {
    if (isSingle) return answer === code
    return Array.isArray(answer) && answer.includes(code)
  }

  const animClass =
    direction === "enter"
      ? "animate-in fade-in slide-in-from-right-8 duration-400"
      : direction === "exit"
        ? "animate-out fade-out slide-out-to-left-8 duration-300"
        : ""

  return (
    <div className={`flex flex-col gap-6 ${animClass}`}>
      {/* 질문 텍스트 */}
      <div className="space-y-2" style={{ minHeight: 48 }}>
        <h2 className="text-lg leading-relaxed font-semibold text-foreground">
          {question.prompt}
        </h2>
        {!isSingle && question.max_selections && (
          <p className="text-xs text-muted-foreground">
            최대 {question.max_selections}개까지 선택할 수 있어요
          </p>
        )}
      </div>

      {/* 선택지 목록 — 고정 최소 높이로 레이아웃 시프트 방지 */}
      <div className="flex flex-col gap-3" style={{ minHeight: 220 }}>
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
                    ? `d8-fadeInUp 0.4s ease-out ${idx * 60}ms both`
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

              {/* 선택 체크 아이콘 */}
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
