import Link from "next/link"
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react"
import { trendForecastBanner } from "@/features/trend/lib/trend-forecast-data"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"

// 트렌드 기능의 진입 배너다. 문구와 핵심 지표는 트렌드 기능이 소유한다.
export function TrendForecastBannerWidget() {
  return (
    <section className="border-b border-border bg-background py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_420px] lg:px-8">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="mb-6 gap-1.5 px-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{trendForecastBanner.eyebrow}</span>
          </Badge>

          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {trendForecastBanner.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {trendForecastBanner.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="justify-between">
              <Link href={trendForecastBanner.primaryCta.href}>
                {trendForecastBanner.primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={trendForecastBanner.secondaryCta.href}>
                {trendForecastBanner.secondaryCta.label}
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-muted/40 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            실시간 예측 하이라이트
          </div>
          <div className="space-y-3">
            {trendForecastBanner.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {metric.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
