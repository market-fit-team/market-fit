"use client"

import { Suspense, useMemo, useState, useTransition } from "react"
import { OnboardingResultPredictionPanelQuery } from "@/features/onboarding/components/result/onboarding-result-prediction-panel-query"
import { OnboardingResultPredictionPanelSkeleton } from "@/features/onboarding/components/result/onboarding-result-prediction-panel-skeleton"
import type { OnboardingCategoryRecommendation } from "@/features/onboarding/types/onboarding"
import { ClientOnly } from "@/shared/components/client-only"
import { Badge } from "@/shared/components/ui/badge"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/components/ui/carousel"
import { cn } from "@/shared/lib/utils"

type OnboardingResultCategoryExplorerProps = {
  categories: OnboardingCategoryRecommendation[]
  resultCode: string
}

export function OnboardingResultCategoryExplorer({
  categories,
  resultCode,
}: OnboardingResultCategoryExplorerProps) {
  const [selectedCategoryCode, setSelectedCategoryCode] = useState(
    categories[0]?.service_category_code ?? ""
  )
  const [isPending, startTransition] = useTransition()

  const selectedCategory = useMemo(() => {
    return (
      categories.find(
        (category) => category.service_category_code === selectedCategoryCode
      ) ?? categories[0]
    )
  }, [categories, selectedCategoryCode])

  if (categories.length === 0 || !selectedCategory) {
    return (
      <Card className="border-dashed border-border/60 bg-muted/10">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          현재 추천 가능한 업종 결과가 없습니다.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="h-4 w-1 rounded-full bg-primary" />
          추천 업종
        </div>
        <div className="px-12">
          <Carousel
            opts={{
              align: "start",
              containScroll: "trimSnaps",
            }}
          >
            <CarouselContent className="-ml-3">
              {categories.map((category) => {
                const isSelected =
                  category.service_category_code ===
                  selectedCategory.service_category_code

                return (
                  <CarouselItem
                    key={category.service_category_code}
                    className="basis-[86%] pl-3 sm:basis-[58%] lg:basis-[42%] xl:basis-[34%]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        startTransition(() => {
                          setSelectedCategoryCode(
                            category.service_category_code
                          )
                        })
                      }}
                      className={cn(
                        "w-full text-left",
                        isPending && isSelected && "opacity-80"
                      )}
                    >
                      <Card
                        className={cn(
                          "h-full border transition-all duration-200",
                          isSelected
                            ? "border-primary/60 bg-primary/5 shadow-lg ring-primary/20"
                            : "border-border/60 bg-card hover:border-primary/30 hover:bg-primary/[0.03]"
                        )}
                      >
                        <CardContent className="space-y-4 py-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={isSelected ? "default" : "secondary"}
                                  className="rounded-full px-2 py-0.5 text-[10px]"
                                >
                                  {category.category_group}
                                </Badge>
                                {isSelected ? (
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                                  >
                                    선택됨
                                  </Badge>
                                ) : null}
                              </div>
                              <div className="text-base font-semibold text-foreground">
                                {category.service_category_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                코드 {category.service_category_code}
                              </div>
                            </div>
                            <div className="rounded-full bg-muted px-3 py-1 text-right">
                              <div className="text-[10px] text-muted-foreground">
                                적합도
                              </div>
                              <div className="text-sm font-bold text-foreground tabular-nums">
                                {Math.round(category.score * 100)}%
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-linear-to-r from-primary/45 via-primary/70 to-primary"
                                style={{
                                  width: `${Math.round(category.score * 100)}%`,
                                }}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                              <MetricCell
                                label="안정성"
                                value={category.stability_prior_score}
                              />
                              <MetricCell
                                label="주말형"
                                value={category.weekend_sales_ratio}
                              />
                              <MetricCell
                                label="저녁형"
                                value={category.evening_sales_ratio}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <CarouselPrevious
              size="icon-lg"
              className="z-10 -left-10 size-10"
            />
            <CarouselNext
              size="icon-lg"
              className="z-10 -right-10 size-10"
            />
          </Carousel>
        </div>
      </div>

      <div className="space-y-4">
        <ClientOnly fallback={<OnboardingResultPredictionPanelSkeleton />}>
          <Suspense fallback={<OnboardingResultPredictionPanelSkeleton />}>
            <OnboardingResultPredictionPanelQuery
              key={selectedCategory.service_category_code}
              resultCode={resultCode}
              selectedCategoryCode={selectedCategory.service_category_code}
              selectedCategoryName={selectedCategory.service_category_name}
            />
          </Suspense>
        </ClientOnly>
      </div>
    </div>
  )
}

type MetricCellProps = {
  label: string
  value: number
}

function MetricCell({ label, value }: MetricCellProps) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2">
      <div>{label}</div>
      <div className="mt-1 font-semibold text-foreground tabular-nums">
        {Math.round(value * 100)}%
      </div>
    </div>
  )
}
