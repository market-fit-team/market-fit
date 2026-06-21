"use client"

import React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { CATEGORY_OPTIONS } from "../_fixtures/survey"

interface CategorySelectorProps {
  /** 현재 선택된 카테고리 코드 */
  value: string
  /** 카테고리 변경 콜백 */
  onChange: (code: string) => void
}

/**
 * 업종 선택 셀렉트 컴포넌트
 * 설문 바깥에서 독립적으로 preferred_category_code를 받아 처리한다
 */
export function CategorySelector({ value, onChange }: CategorySelectorProps) {
  return (
    <div className="d5-category-selector">
      <p className="d5-category-label">창업하려는 업종을 먼저 선택해 주세요</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="d5-select-trigger">
          <SelectValue placeholder="업종 선택" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((cat) => (
            <SelectItem key={cat.code} value={cat.code}>
              <span className="d5-select-item-inner">
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
