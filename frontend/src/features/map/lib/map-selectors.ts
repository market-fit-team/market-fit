import type {
  BudgetRange,
  TargetDemographic,
  TradeAreaId,
} from "@/features/map/types/map"
import { districtsData, personaResults } from "@/features/startup/lib/data"

// 기존 mock 상권 id를 테스트용 polygon id로 변환
// 백엔드 연결 시 이 매핑과 추천 selector를 제거
const polygonTradeAreaIds: Record<TradeAreaId, TradeAreaId[]> = {
  gangnam: ["1123064"],
  itaewon: ["1103065"],
  jongno: ["1101061"],
  mapo: ["1114066"],
  seongdong: ["1104066"],
}

type FilteredTradeAreaInput = {
  activePersona: string | null
  budgetRange: BudgetRange
  recommendationsOnly: boolean
  selectedCategory: string
  targetDemographic: TargetDemographic
}

// 선택자 유틸은 필터링 규칙이 위젯과 스토어 조각에 흩어지지 않게 한다.
export const getSelectedTradeArea = (selectedTradeAreaId: TradeAreaId | null) =>
  districtsData.find((district) => district.id === selectedTradeAreaId) ?? null

export const getFilteredTradeAreas = ({
  activePersona,
  budgetRange,
  recommendationsOnly,
  selectedCategory,
  targetDemographic,
}: FilteredTradeAreaInput) =>
  districtsData.filter((district) => {
    if (selectedCategory !== "all") {
      const hasSector = district.topSectors.some((sector) =>
        sector.sector.includes(selectedCategory)
      )

      if (!hasSector) {
        return false
      }
    }

    if (budgetRange !== "all") {
      if (budgetRange === "low" && district.avgSales > 3000) {
        return false
      }

      if (budgetRange === "high" && district.avgSales < 3500) {
        return false
      }
    }

    if (targetDemographic !== "all") {
      const dominantAge = district.footTrafficAge.reduce((current, next) =>
        next.percentage > current.percentage ? next : current
      )

      if (targetDemographic === "20" && dominantAge.ageGroup !== "20대") {
        return false
      }

      if (targetDemographic === "30" && dominantAge.ageGroup !== "30대") {
        return false
      }

      if (
        targetDemographic === "50" &&
        dominantAge.ageGroup !== "40대" &&
        dominantAge.ageGroup !== "50대 이상"
      ) {
        return false
      }
    }

    if (recommendationsOnly && activePersona) {
      const personaInfo = personaResults[activePersona]

      if (
        personaInfo &&
        !personaInfo.recommendedDistricts.includes(district.id)
      ) {
        return false
      }
    }

    return true
  })

export const getFilteredTradeAreaIds = (input: FilteredTradeAreaInput) =>
  new Set(getFilteredTradeAreas(input).map((district) => district.id))

export const getRecommendedTradeAreaIds = (activePersona: string | null) => {
  if (!activePersona) {
    return []
  }

  const legacyTradeAreaIds =
    personaResults[activePersona]?.recommendedDistricts ?? []

  return legacyTradeAreaIds.flatMap(
    (tradeAreaId) => polygonTradeAreaIds[tradeAreaId] ?? []
  )
}
