import type { ReactNode } from "react"
import { ONBOARDING_SURVEY_PROGRESS_DURATION_MS } from "@/features/onboarding/lib/onboarding-survey-motion"
import { Progress } from "@/shared/components/ui/progress"

type SurveyProgressProps = {
  current: number
  total: number
  title?: ReactNode
}

export function SurveyProgress({ current, total, title }: SurveyProgressProps) {
  const percent = Math.round(((current + 1) / total) * 100)

  return (
    <div className="flex flex-col gap-3" style={{ minHeight: 52 }}>
      <div className="flex items-center justify-between">
        {title ? (
          title
        ) : (
          <span className="text-xs tracking-wider text-muted-foreground uppercase">
            질문 {current + 1} / {total}
          </span>
        )}

        <div className="flex items-center gap-2">
          {title && (
            <span className="text-xs tracking-wider text-muted-foreground uppercase">
              질문 {current + 1} / {total}
            </span>
          )}
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {percent}%
          </span>
        </div>
      </div>

      <Progress value={percent} className="h-1.5" />

      <div className="flex justify-center gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className={`h-1.5 rounded-full transition-all ease-out ${
              index < current
                ? "w-1.5 bg-primary"
                : index === current
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted"
            }`}
            style={{
              transitionDuration: `${ONBOARDING_SURVEY_PROGRESS_DURATION_MS}ms`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
