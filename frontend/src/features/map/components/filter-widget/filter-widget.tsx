"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Filter, HelpCircle, X } from "lucide-react"
import { getFilteredTradeAreas } from "@/features/map/lib/map-selectors"
import { useMapStore } from "@/features/map/store/map-store"
import { personaResults } from "@/features/startup/lib/data"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/components/ui/native-select"

// FilterWidget은 MapView의 왼쪽 사이드바에 들어가는 검색 컨트롤을 소유한다.
// 사이드바가 어디에 배치되는지는 알지 않는다.
export function FilterWidget() {
  const router = useRouter()
  const activePersona = useMapStore((state) => state.activePersona)
  const budgetRange = useMapStore((state) => state.budgetRange)
  const closeFilter = useMapStore((state) => state.closeFilter)
  const clearActivePersona = useMapStore((state) => state.clearActivePersona)
  const recommendationsOnly = useMapStore((state) => state.recommendationsOnly)
  const resetFilters = useMapStore((state) => state.resetFilters)
  const selectedCategory = useMapStore((state) => state.selectedCategory)
  const setBudgetRange = useMapStore((state) => state.setBudgetRange)
  const setRecommendationsOnly = useMapStore(
    (state) => state.setRecommendationsOnly
  )
  const setSelectedCategory = useMapStore((state) => state.setSelectedCategory)
  const setTargetDemographic = useMapStore(
    (state) => state.setTargetDemographic
  )
  const targetDemographic = useMapStore((state) => state.targetDemographic)

  const filteredTradeAreas = getFilteredTradeAreas({
    activePersona,
    budgetRange,
    recommendationsOnly,
    selectedCategory,
    targetDemographic,
  })

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-4">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">상권 탐색 필터</CardTitle>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={closeFilter}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5 text-xs">
        {activePersona ? (
          <Card size="sm" className="bg-primary/5">
            <CardContent>
              <div className="mb-2 flex items-center justify-between gap-3">
                <Badge variant="secondary">나의 유저 타워 로드됨</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    localStorage.removeItem("g15_persona")
                    clearActivePersona()
                    setRecommendationsOnly(false)
                    router.replace("/map")
                  }}
                >
                  해제
                </Button>
              </div>
              <p className="font-medium text-foreground">
                {personaResults[activePersona]?.title}
              </p>

              <label className="mt-3 flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={recommendationsOnly}
                  onCheckedChange={(checked) =>
                    setRecommendationsOnly(checked === true)
                  }
                />
                <span className="text-xs text-muted-foreground">
                  추천 상권만 지도에 표시
                </span>
              </label>
            </CardContent>
          </Card>
        ) : (
          <Card size="sm" className="bg-muted/20">
            <CardContent className="text-center">
              <p className="mb-2 leading-relaxed text-muted-foreground">
                성향 온보딩 분석을 하시면 어울리는 행정동 상권 정보가 자동
                로드됩니다.
              </p>
              <Button asChild variant="ghost" size="xs">
                <Link href="/onboarding">
                  <HelpCircle className="h-3.5 w-3.5" />
                  성향 분석하기
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            창업 희망 업종
          </label>
          <NativeSelect
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full"
          >
            <NativeSelectOption value="all">전체 업종</NativeSelectOption>
            <NativeSelectOption value="커피">
              커피 및 디저트 카페
            </NativeSelectOption>
            <NativeSelectOption value="일식">
              일식 전문점 / 이자카야
            </NativeSelectOption>
            <NativeSelectOption value="한식">
              한식 밥집 / 요리주점
            </NativeSelectOption>
            <NativeSelectOption value="아시안">
              아시안 푸드 / 마라탕
            </NativeSelectOption>
            <NativeSelectOption value="스튜디오">
              셀프 스튜디오 / 사진관
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            자본금 규모
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {["all", "low", "high"].map((type) => (
              <Button
                key={type}
                type="button"
                variant={budgetRange === type ? "secondary" : "outline"}
                size="lg"
                onClick={() => setBudgetRange(type as typeof budgetRange)}
                className="w-full"
              >
                {type === "all" ? "전체" : type === "low" ? "소자본" : "여유"}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            핵심 타겟 연령층
          </label>
          <NativeSelect
            value={targetDemographic}
            onChange={(e) =>
              setTargetDemographic(e.target.value as typeof targetDemographic)
            }
            className="w-full"
          >
            <NativeSelectOption value="all">전체 연령</NativeSelectOption>
            <NativeSelectOption value="20">
              20대 위주 (대학생/관광객)
            </NativeSelectOption>
            <NativeSelectOption value="30">
              30대 위주 (직장인/오피스)
            </NativeSelectOption>
            <NativeSelectOption value="50">
              40대 이상 (전통시장/주거지역)
            </NativeSelectOption>
          </NativeSelect>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-4 text-xs text-muted-foreground">
        <span>검색: {filteredTradeAreas.length}개 지역</span>
        <Button type="button" variant="ghost" size="xs" onClick={resetFilters}>
          필터 초기화
        </Button>
      </CardFooter>
    </Card>
  )
}
