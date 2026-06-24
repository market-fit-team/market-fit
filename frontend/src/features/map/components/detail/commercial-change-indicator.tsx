import { Activity } from "lucide-react"
import type { CommercialChangeIndicator } from "@/features/map/types/map"

type CommercialChangeIndicatorProps = {
  indicator: CommercialChangeIndicator
}

export function CommercialChangeIndicatorSection({
  indicator,
}: CommercialChangeIndicatorProps) {
  return (
    <section aria-labelledby="commercial-change-title">
      <h3
        id="commercial-change-title"
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
      >
        <Activity className="h-4 w-4 text-primary" />
        상권변화지표
      </h3>
      <div className="mt-4 flex flex-col gap-4 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-background font-mono text-lg font-bold text-foreground">
          {indicator.code}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {indicator.label}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {indicator.description}
          </p>
          <p className="pt-1 text-[10px] text-muted-foreground">
            서울시 생존·폐업 사업체의 평균 영업기간 비교 기준
          </p>
        </div>
      </div>
    </section>
  )
}
