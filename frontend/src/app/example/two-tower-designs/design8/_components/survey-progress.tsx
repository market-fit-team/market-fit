"use client"

/**
 * 설문 진행률 표시 헤더 컴포넌트
 * 진행률 바 + 단계 도트 인디케이터를 보여준다.
 * 레이아웃 시프트 방지를 위해 고정 높이를 사용한다.
 */
import { Progress } from "@/shared/components/ui/progress"

interface SurveyProgressProps {
  /** 현재 문항 인덱스 (0-based) */
  current: number
  /** 전체 문항 수 */
  total: number
}

export function SurveyProgress({ current, total }: SurveyProgressProps) {
  const pct = Math.round(((current + 1) / total) * 100)

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 52 }}>
      {/* 상단 문항 카운터 */}
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wider text-muted-foreground uppercase">
          질문 {current + 1} / {total}
        </span>
        <span className="text-xs font-semibold text-foreground tabular-nums">
          {pct}%
        </span>
      </div>

      {/* 진행률 바 */}
      <Progress value={pct} className="h-1.5" />

      {/* 단계 점 인디케이터 */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
              i < current
                ? "w-1.5 bg-primary"
                : i === current
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  )
}
