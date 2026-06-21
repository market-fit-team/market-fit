import * as React from "react"
import { Badge } from "@/shared/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"

export interface Recommendation {
  rank: number
  score: number
  item_id: string
  area_name: string
  service_category_name: string
  area_profile_type: string
  sales_amount: number
  weekend_sales_ratio: number
  evening_sales_ratio: number
  resident_population: number
  worker_population: number
  subway_commercial_trend_score: number
  category_opportunity_score: number
  demand_gap_score: number
}

interface RecommendationCardProps {
  recommendation: Recommendation
}

export function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const {
    rank,
    score,
    area_name,
    service_category_name,
    area_profile_type,
    sales_amount,
    weekend_sales_ratio,
    evening_sales_ratio,
  } = recommendation

  const formatCurrency = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억`
    }
    return `${(amount / 10000).toLocaleString()}만`
  }

  const formatPercent = (ratio: number) => {
    return `${(ratio * 100).toFixed(0)}%`
  }

  const getProfileTypeLabel = (type: string) => {
    switch (type) {
      case "residential":
        return "주거 중심"
      case "commercial":
        return "상업 중심"
      case "mixed":
        return "복합 상권"
      default:
        return type
    }
  }

  return (
    <Card className="relative w-full overflow-hidden border border-border/50 bg-gradient-to-br from-card to-muted/20 transition-all hover:shadow-lg">
      {/* Rank Badge */}
      <div className="absolute top-0 right-0">
        <div className="rounded-bl-xl bg-primary px-4 py-1 text-sm font-bold text-primary-foreground shadow-sm">
          {rank}위
        </div>
      </div>

      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-background/50 font-medium backdrop-blur-sm"
            >
              {getProfileTypeLabel(area_profile_type)}
            </Badge>
            <span className="flex items-center text-xs font-medium text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="mr-1 h-3.5 w-3.5 text-primary/70"
              >
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                  clipRule="evenodd"
                />
              </svg>
              {score.toFixed(2)}
            </span>
          </div>
          <CardTitle className="mt-1 flex items-baseline gap-2 text-2xl font-black tracking-tight">
            {area_name}{" "}
            <span className="text-lg font-bold text-muted-foreground">
              · {service_category_name}
            </span>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 border-t border-border/40 pt-2">
          <div className="flex flex-col items-center justify-center rounded-lg bg-background/60 p-3">
            <span className="mb-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
              월 평균 매출
            </span>
            <span className="text-sm font-bold text-foreground sm:text-base">
              {formatCurrency(sales_amount)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-background/60 p-3">
            <span className="mb-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
              주말 매출 비중
            </span>
            <span className="text-sm font-bold text-foreground sm:text-base">
              {formatPercent(weekend_sales_ratio)}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg bg-background/60 p-3">
            <span className="mb-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
              저녁 매출 비중
            </span>
            <span className="text-sm font-bold text-foreground sm:text-base">
              {formatPercent(evening_sales_ratio)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
