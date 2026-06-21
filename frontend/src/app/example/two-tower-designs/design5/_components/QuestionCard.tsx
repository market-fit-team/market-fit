"use client"

import React from "react"
import type { SurveyQuestion } from "../_fixtures/survey"

interface QuestionCardProps {
  /** 현재 표시 중인 질문 */
  question: SurveyQuestion
  /** 현재 선택된 값 (단일: string, 복수: string[]) */
  selectedValues: string[]
  /** 선택 변경 콜백 */
  onChange: (values: string[]) => void
  /** 전체 질문 수 (프로그레스 표시용) */
  totalCount: number
  /** 현재 질문 인덱스 (0부터) */
  currentIndex: number
}

/**
 * 설문 질문 카드 컴포넌트
 * 단일/복수 선택 모두 처리하며, 옵션 클릭 시 강조 표시된다
 */
export function QuestionCard({
  question,
  selectedValues,
  onChange,
  totalCount,
  currentIndex,
}: QuestionCardProps) {
  /** 옵션 선택 핸들러 */
  const handleSelect = (code: string) => {
    if (question.selectionType === "single") {
      // 단일 선택: 이미 선택된 경우 해제
      onChange(selectedValues[0] === code ? [] : [code])
    } else {
      // 복수 선택
      const max = question.maxSelections ?? 999
      if (selectedValues.includes(code)) {
        onChange(selectedValues.filter((v) => v !== code))
      } else if (selectedValues.length < max) {
        onChange([...selectedValues, code])
      }
    }
  }

  return (
    <div className="d5-question-card">
      {/* 질문 헤더 */}
      <div className="d5-question-header">
        <span className="d5-question-number">
          Q{currentIndex + 1}
          <span className="d5-question-total"> / {totalCount}</span>
        </span>
        {question.selectionType === "multi" && (
          <span className="d5-multi-badge">
            최대 {question.maxSelections}개 선택
          </span>
        )}
      </div>

      {/* 질문 텍스트 */}
      <p className="d5-question-prompt">{question.prompt}</p>

      {/* 선택지 목록 */}
      <ul className="d5-options-list">
        {question.options.map((opt, idx) => {
          const isSelected = selectedValues.includes(opt.code)
          return (
            <li key={opt.code}>
              <button
                id={`d5-option-${question.id}-${opt.code}`}
                className={`d5-option-btn ${isSelected ? "d5-option-btn--selected" : ""}`}
                onClick={() => handleSelect(opt.code)}
                aria-pressed={isSelected}
              >
                {/* 선택지 코드 표시 원 */}
                <span className="d5-option-code">{opt.code}</span>
                <span className="d5-option-label">{opt.label}</span>
                {/* 선택 시 체크 인디케이터 */}
                {isSelected && (
                  <span className="d5-option-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
