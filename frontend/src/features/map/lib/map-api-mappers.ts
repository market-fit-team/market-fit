import type { Geometry } from "geojson"
import type { IndustryMajorOption } from "@/features/map/lib/industry-filter-options"
import type {
  AdminAreaFeature,
  AdminAreaMapData,
  DetailReportData,
  IndustryCompetitionRank,
  MarketFranchiseRecommendation,
  MarketPreviewData,
  MarketPreviewIndustryRanking,
  MarketSearchArea,
} from "@/features/map/types/map"
import type {
  ApiResponseAdminAreaHierarchyResponse,
  ApiResponseAreaSearchResponse,
  ApiResponseIndustryCategoriesResponse,
  ApiResponseMarketReportPreviewResponse,
  ApiResponseMarketReportResponse,
} from "@/shared/api/generated/market/schemas"

type GeneratedAdminAreas = NonNullable<
  ApiResponseAdminAreaHierarchyResponse["data"]
>

type GeneratedMarketPreview = NonNullable<
  ApiResponseMarketReportPreviewResponse["data"]
>

type GeneratedMarketReport = NonNullable<
  ApiResponseMarketReportResponse["data"]
>

type GeneratedSearchAreas = NonNullable<ApiResponseAreaSearchResponse["data"]>

type GeneratedAreaProperties = NonNullable<
  NonNullable<GeneratedAdminAreas["sigungu"]>[number]["properties"]
>

type GeneratedIndustryCategories = NonNullable<
  ApiResponseIndustryCategoriesResponse["data"]
>

// preview·report 응답의 franchiseRecommendations 항목은 구조가 동일하다.
type GeneratedFranchiseRecommendation = {
  brandCode?: string
  brandName?: string
  companyName?: string
  estimatedSalesAmount?: number
  franchiseCount?: number
  startupCostTotal?: number
}

const toStringValue = (value: string | undefined, fallback = "") =>
  value ?? fallback

const toNumberValue = (value: number | undefined, fallback = 0) =>
  value ?? fallback

const toOptionalNumber = (value: number | undefined) => value

const toOptionalString = (value: string | undefined) => value || undefined

const isGeometry = (geometry: unknown): geometry is Geometry =>
  typeof geometry === "object" &&
  geometry !== null &&
  "type" in geometry &&
  "coordinates" in geometry

const toLngLatCoordinate = (coordinate: number[]) => {
  const [first, second, ...rest] = coordinate

  if (first === undefined || second === undefined) {
    return coordinate
  }

  const looksLikeLatLng =
    Math.abs(first) <= 90 && Math.abs(second) > 90 && Math.abs(second) <= 180

  return looksLikeLatLng ? [second, first, ...rest] : coordinate
}

const normalizeLngLatCoordinates = (coordinates: unknown): unknown => {
  if (!Array.isArray(coordinates)) {
    return coordinates
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    return toLngLatCoordinate(coordinates)
  }

  return coordinates.map(normalizeLngLatCoordinates)
}

const normalizeGeometryLngLat = (geometry: Geometry): Geometry => {
  if (geometry.type === "GeometryCollection") {
    return {
      ...geometry,
      geometries: geometry.geometries.map(normalizeGeometryLngLat),
    }
  }

  return {
    ...geometry,
    coordinates: normalizeLngLatCoordinates(geometry.coordinates),
  } as Geometry
}

const hasPointCoordinate = (lat: number | undefined, lng: number | undefined) =>
  lat !== undefined && lng !== undefined

const toAdminAreaProperties = (
  properties: GeneratedAreaProperties | undefined,
  areaType: "dong" | "sigungu"
) => ({
  areaType,
  baseDate: toStringValue(properties?.baseDate),
  centerLat: toNumberValue(properties?.centerLat),
  centerLng: toNumberValue(properties?.centerLng),
  code: toStringValue(properties?.code),
  name: toStringValue(properties?.name),
  sigunguCode: toStringValue(properties?.sigunguCode),
  sigunguName: toStringValue(properties?.sigunguName),
})

const toGeoJsonFeature = (
  area: {
    geometry?: unknown
    properties?: GeneratedAreaProperties
  },
  areaType: "dong" | "sigungu"
): AdminAreaFeature | null => {
  if (!isGeometry(area.geometry)) {
    return null
  }

  return {
    geometry: normalizeGeometryLngLat(area.geometry),
    properties: toAdminAreaProperties(area.properties, areaType),
    type: "Feature",
  }
}

const toMarketSearchArea = (
  area: NonNullable<GeneratedSearchAreas["areas"]>[number]
): MarketSearchArea => ({
  centerLat: area.centerLat ?? 0,
  centerLng: area.centerLng ?? 0,
  dongCode: toStringValue(area.dongCode),
  dongName: toStringValue(area.dongName, area.dongCode),
  estimatedSalesAmount: toOptionalNumber(area.estimatedSalesAmount),
  industryCode: toOptionalString(area.industryCode),
  industryName: toOptionalString(area.industryName),
  rank: toOptionalNumber(area.rank),
  sigunguCode: toStringValue(area.sigunguCode),
  sigunguName: toStringValue(area.sigunguName),
})

const hasSearchMarkerCoordinate = (
  area: NonNullable<GeneratedSearchAreas["areas"]>[number]
) =>
  Boolean(area.dongCode) && hasPointCoordinate(area.centerLat, area.centerLng)

const toMarketPreviewRanking = (
  ranking: NonNullable<GeneratedMarketPreview["industryRankings"]>[number]
): MarketPreviewIndustryRanking => ({
  estimatedSalesAmount: toNumberValue(ranking.estimatedSalesAmount),
  estimatedSalesPerStore: toNumberValue(ranking.estimatedSalesPerStore),
  industryCode: toStringValue(ranking.industryCode),
  industryName: toStringValue(ranking.industryName),
  previousPeriodChangeRate: toNumberValue(ranking.previousPeriodChangeRate),
  rank: toNumberValue(ranking.rank),
  salesCount: toNumberValue(ranking.salesCount),
  storeCount: toNumberValue(ranking.storeCount),
})

const toAgeGroupLabel = (ageGroup: string) =>
  ageGroup === "60+" ? "60대+" : `${ageGroup}대`

const toManwon = (value: number | undefined) =>
  Math.round(toNumberValue(value) / 10_000)

export const toAdminAreaMapData = (
  payload: GeneratedAdminAreas | undefined
): AdminAreaMapData => {
  const sigungu = payload?.sigungu ?? []

  return {
    dongGeoJson: {
      features: sigungu.flatMap((area) =>
        (area.dongs ?? [])
          .map((dong) => toGeoJsonFeature(dong, "dong"))
          .filter((feature): feature is AdminAreaFeature => feature !== null)
      ),
      type: "FeatureCollection",
    },
    sigunguGeoJson: {
      features: sigungu
        .map((area) => toGeoJsonFeature(area, "sigungu"))
        .filter((feature): feature is AdminAreaFeature => feature !== null),
      type: "FeatureCollection",
    },
  }
}

// 응답 금액 단위(천원)를 만원으로 환산한다. 값이 없으면 undefined를 유지한다.
const toManwonFromThousand = (value: number | undefined) =>
  value == null ? undefined : Math.round(value / 10)

const toFranchiseRecommendation = (
  item: GeneratedFranchiseRecommendation
): MarketFranchiseRecommendation => ({
  brandCode: toStringValue(item.brandCode, toStringValue(item.brandName)),
  brandName: toStringValue(item.brandName),
  companyName: toOptionalString(item.companyName),
  estimatedSalesAmount: toManwonFromThousand(item.estimatedSalesAmount),
  franchiseCount: toOptionalNumber(item.franchiseCount),
  startupCostTotal: toManwonFromThousand(item.startupCostTotal),
})

// 대분류별 업종 목록 응답을 필터 UI용 옵션 트리로 변환한다.
export const toMarketIndustryOptions = (
  payload: GeneratedIndustryCategories | undefined
): IndustryMajorOption[] =>
  (payload?.categories ?? []).map((category) => ({
    code: toStringValue(category.categoryCode),
    minors: (category.industries ?? []).map((industry) => ({
      code: toStringValue(industry.code),
      name: toStringValue(industry.name),
    })),
    name: toStringValue(category.categoryName),
  }))

export const toMarketPreviewData = (
  payload: GeneratedMarketPreview | undefined
): MarketPreviewData => ({
  franchiseRecommendations: (payload?.franchiseRecommendations ?? []).map(
    toFranchiseRecommendation
  ),
  industryRankings: (payload?.industryRankings ?? []).map(
    toMarketPreviewRanking
  ),
})

const toIndustryCompetitionRank = (
  item: NonNullable<
    GeneratedMarketReport["stores"]
  >["lowClosureRateTop3"] extends (infer Ranking)[] | undefined
    ? Ranking
    : never
): IndustryCompetitionRank => ({
  closeRate: toNumberValue(item.closeRate),
  closedStores: toNumberValue(item.closedStores),
  franchiseStores: toNumberValue(item.franchiseStores),
  industryCode: toStringValue(item.industryCode),
  industryName: toStringValue(item.industryName),
  openRate: toNumberValue(item.openRate),
  openedStores: toNumberValue(item.openedStores),
  rank: toNumberValue(item.rank),
  totalStores: toNumberValue(item.totalStores),
})

export const toDetailReportData = (
  payload: Partial<GeneratedMarketReport>
): DetailReportData => {
  const genderAgeGroups = payload.residentPopulation?.genderAgeGroups ?? []
  const ageGroups = Array.from(
    new Set(genderAgeGroups.map((item) => toStringValue(item.ageGroup)))
  ).filter(Boolean)

  return {
    commercialChangeIndicator:
      payload.tradeAreaChange?.changeIndex === "HH" ||
      payload.tradeAreaChange?.changeIndex === "HL" ||
      payload.tradeAreaChange?.changeIndex === "LH" ||
      payload.tradeAreaChange?.changeIndex === "LL"
        ? {
            code: payload.tradeAreaChange.changeIndex,
            description: toStringValue(
              payload.tradeAreaChange.displayDescription
            ),
            label: toStringValue(payload.tradeAreaChange.changeIndexName),
          }
        : null,
    competition: payload.stores
      ? {
          closeCount: toNumberValue(payload.stores.closedStores),
          franchiseStoreCount: toNumberValue(payload.stores.franchiseStores),
          highClosureRateTop3: (payload.stores.highClosureRateTop3 ?? []).map(
            toIndustryCompetitionRank
          ),
          highOpenRateTop3: (payload.stores.highOpenRateTop3 ?? []).map(
            toIndustryCompetitionRank
          ),
          lowClosureRateTop3: (payload.stores.lowClosureRateTop3 ?? []).map(
            toIndustryCompetitionRank
          ),
          openCount: toNumberValue(payload.stores.openedStores),
          storeCount: toNumberValue(payload.stores.totalStores),
        }
      : null,
    dataQuality: {
      availableSections: payload.dataQuality?.availableSections ?? [],
      missingSections: payload.dataQuality?.missingSections ?? [],
      note: toStringValue(payload.dataQuality?.note),
    },
    franchiseRecommendations: (payload.franchiseRecommendations ?? []).map(
      toFranchiseRecommendation
    ),
    footTraffic: payload.floatingPopulation
      ? {
          peakTimeSlot: toOptionalString(
            payload.floatingPopulation.peakTimeSlot
          ),
          peakWeekday: toOptionalString(payload.floatingPopulation.peakWeekday),
          points: (payload.floatingPopulation.timeSlots ?? []).map((slot) => ({
            hour: toStringValue(slot.timeSlot).split("-")[0] ?? "",
            value: toNumberValue(slot.count),
          })),
          total: toNumberValue(payload.floatingPopulation.total),
          youngAdultRatio: toOptionalNumber(
            payload.floatingPopulation.youngAdultRatio
          ),
        }
      : null,
    residentPopulation: payload.residentPopulation
      ? {
          byAge: ageGroups.map((ageGroup) => {
            const male =
              genderAgeGroups.find(
                (item) => item.ageGroup === ageGroup && item.gender === "male"
              )?.count ?? 0
            const female =
              genderAgeGroups.find(
                (item) => item.ageGroup === ageGroup && item.gender === "female"
              )?.count ?? 0

            return {
              ageGroup: toAgeGroupLabel(ageGroup),
              female,
              male,
            }
          }),
          total: toNumberValue(payload.residentPopulation.total),
        }
      : null,
    industrySalesRanking: (payload.sales?.industryRankings ?? []).map(
      (ranking) => ({
        estimatedSalesAmount: toManwon(ranking.estimatedSalesAmount),
        estimatedSalesPerStore: toManwon(ranking.estimatedSalesPerStore),
        industryName: toStringValue(ranking.industryName),
        previousPeriodChangeRate: toNumberValue(
          ranking.previousPeriodChangeRate
        ),
        rank: toNumberValue(ranking.rank),
        storeCount: toNumberValue(ranking.storeCount),
      })
    ),
    weekdayWeekendSales: payload.sales
      ? {
          weekday: toManwon(payload.sales.weekdaySalesAmount),
          weekdayRatio: toNumberValue(payload.sales.weekdaySalesRatio),
          weekend: toManwon(payload.sales.weekendSalesAmount),
          weekendRatio: toNumberValue(payload.sales.weekendSalesRatio),
        }
      : null,
  }
}

export const toMarketAreaSearchResult = (
  payload: GeneratedSearchAreas | undefined
) => ({
  areas: (payload?.areas ?? [])
    .filter(hasSearchMarkerCoordinate)
    .map(toMarketSearchArea),
  keyword: toStringValue(payload?.keyword),
})
