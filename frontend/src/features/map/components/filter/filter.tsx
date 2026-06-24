"use client"

import { useFilteredRecommendedAreas } from "@/features/map/hooks/use-filtered-recommended-areas"
import { useMapStore } from "@/features/map/store/map-store"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/shared/components/ui/native-select"

// Filter는 MapView 상단의 가로 검색 바를 소유한다.
// 추천 목록을 좁히는 2차 검색이며, 바가 어디에 배치되는지는 알지 않는다.
export function Filter() {
  const budgetRange = useMapStore((state) => state.budgetRange)
  const resetFilters = useMapStore((state) => state.resetFilters)
  const selectedCategory = useMapStore((state) => state.selectedCategory)
  const setBudgetRange = useMapStore((state) => state.setBudgetRange)
  const setSelectedCategory = useMapStore((state) => state.setSelectedCategory)
  const setTargetDemographic = useMapStore(
    (state) => state.setTargetDemographic
  )
  const targetDemographic = useMapStore((state) => state.targetDemographic)

  // 카운트는 추천 목록과 동일한 필터 결과를 보여준다.
  const filteredRecommendedAreas = useFilteredRecommendedAreas()

  return (
    <Card className="overflow-hidden bg-card/30 py-0 backdrop-blur-sm">
      <CardContent className="flex items-center gap-3 overflow-x-auto px-4 py-3 text-xs whitespace-nowrap">
        <NativeSelect
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-40 shrink-0"
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

        <div className="flex shrink-0 gap-1.5">
          {["all", "low", "high"].map((type) => (
            <Button
              key={type}
              type="button"
              variant={budgetRange === type ? "secondary" : "outline"}
              size="sm"
              onClick={() => setBudgetRange(type as typeof budgetRange)}
            >
              {type === "all" ? "전체" : type === "low" ? "소자본" : "여유"}
            </Button>
          ))}
        </div>

        <NativeSelect
          value={targetDemographic}
          onChange={(e) =>
            setTargetDemographic(e.target.value as typeof targetDemographic)
          }
          className="w-44 shrink-0"
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

        <div className="ml-auto flex shrink-0 items-center gap-3 text-muted-foreground">
          <span>{filteredRecommendedAreas.length}개 지역</span>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={resetFilters}
          >
            필터 초기화
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
