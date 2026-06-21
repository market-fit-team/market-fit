"use client"

import * as React from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/utils"

export interface Option {
  code: string
  label: string
}

export interface QuestionCardProps {
  id: string
  prompt: string
  options: Option[]
  selectionType: "single" | "multi"
  maxSelections?: number | null
  selectedCodes: string[]
  onChange: (codes: string[]) => void
}

export function QuestionCard({
  id,
  prompt,
  options,
  selectionType,
  maxSelections,
  selectedCodes,
  onChange,
}: QuestionCardProps) {
  const handleOptionClick = (code: string) => {
    if (selectionType === "single") {
      onChange([code])
    } else {
      const isSelected = selectedCodes.includes(code)
      if (isSelected) {
        onChange(selectedCodes.filter((c) => c !== code))
      } else {
        if (maxSelections && selectedCodes.length >= maxSelections) {
          // You could show a toast here, but for now we just ignore if limit reached
          return
        }
        onChange([...selectedCodes, code])
      }
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl border-2 shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {id.replace("q", "Q")}
          </span>
          {selectionType === "multi" && maxSelections && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
              최대 {maxSelections}개 선택
            </span>
          )}
        </div>
        <CardTitle className="text-lg leading-relaxed font-bold md:text-xl">
          {prompt}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {options.map((option) => {
            const isSelected = selectedCodes.includes(option.code)
            return (
              <button
                key={option.code}
                onClick={() => handleOptionClick(option.code)}
                className={cn(
                  "relative flex w-full items-center rounded-xl border-2 p-4 text-left transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-muted bg-background hover:border-primary/30 hover:bg-muted/50"
                )}
              >
                <div
                  className={cn(
                    "mr-3 flex h-5 w-5 items-center justify-center rounded border transition-colors",
                    selectionType === "single" ? "rounded-full" : "rounded-md",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-transparent"
                  )}
                >
                  {isSelected && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3 w-3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  className={cn(
                    "flex-1 text-sm font-medium md:text-base",
                    isSelected ? "text-primary" : "text-foreground"
                  )}
                >
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
