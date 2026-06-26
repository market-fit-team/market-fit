import type { Feature, FeatureCollection, Geometry } from "geojson"

export type TradeAreaId = string

export type MapTab = "franchises" | "sales"

export type DongCode = string

export type AdminAreaProperties = {
  areaType: "dong" | "sigungu"
  baseDate: string
  centerLat: number
  centerLng: number
  code: string
  name: string
  sigunguCode: string
  sigunguName: string
}

export type AdminAreaFeature = Feature<Geometry, AdminAreaProperties>

export type SigunguAdminArea = AdminAreaFeature & {
  dongs: AdminAreaFeature[]
}

export type AdminAreaMapData = {
  dongGeoJson: FeatureCollection<Geometry, AdminAreaProperties>
  sigunguGeoJson: FeatureCollection<Geometry, AdminAreaProperties>
}

export type MarketSearchArea = {
  centerLat: number
  centerLng: number
  dongCode: DongCode
  dongName: string
  estimatedSalesAmount?: number
  industryCode?: string
  industryName?: string
  rank?: number
  sigunguCode: string
  sigunguName: string
}

export type MarketRecommendedArea = {
  dongCode: DongCode
  score: number
}

export type MarketFranchiseRecommendation = {
  brandCode: string
  brandName: string
  companyName?: string
  // 가맹점 평균 추정매출(만원/년) — 응답의 천원 단위를 만원으로 환산해 보관
  estimatedSalesAmount?: number
  franchiseCount?: number
  // 예상 창업비용 합계(만원) — 응답의 천원 단위를 만원으로 환산해 보관
  startupCostTotal?: number
}

export type MarketAreaListItem = MarketSearchArea & {
  score?: number
}

export type MarketPreviewIndustryRanking = {
  estimatedSalesAmount: number
  estimatedSalesPerStore: number
  industryCode: string
  industryName: string
  previousPeriodChangeRate: number
  rank: number
  salesCount: number
  storeCount: number
}

export type MarketPreviewData = {
  franchiseRecommendations: MarketFranchiseRecommendation[]
  industryRankings: MarketPreviewIndustryRanking[]
}

export type MapFocusRequest = {
  dongCode: DongCode
  requestId: number
}

export type HourlyFootTraffic = {
  hour: string
  value: number
}

export type FootTrafficData = {
  points: HourlyFootTraffic[]
  peakTimeSlot?: string
  peakWeekday?: string
  total: number
  youngAdultRatio?: number
}

export type ResidentPopulationByAge = {
  ageGroup: string
  male: number
  female: number
}

export type ResidentPopulation = {
  total: number
  byAge: ResidentPopulationByAge[]
}

export type WeekdayWeekendSalesSummary = {
  weekday: number
  weekdayRatio: number
  weekend: number
  weekendRatio: number
}

export type SectorSalesRank = {
  rank: number
  sector: string
  estimatedSales: number
  qoqChange: number
  storeCount: number
  salesPerStore: number
}

export type IndustryCompetitionRank = {
  closeRate: number
  closedStores: number
  franchiseStores: number
  industryCode: string
  industryName: string
  openRate: number
  openedStores: number
  rank: number
  totalStores: number
}

export type CompetitionStats = {
  storeCount: number
  franchiseStoreCount: number
  openCount: number
  closeCount: number
  lowClosureRateTop3: IndustryCompetitionRank[]
  highClosureRateTop3: IndustryCompetitionRank[]
  highOpenRateTop3: IndustryCompetitionRank[]
}

export type CommercialChangeIndicator = {
  code: "HH" | "HL" | "LH" | "LL"
  label: string
  description: string
}

export type DetailDataQuality = {
  availableSections: string[]
  missingSections: string[]
  note: string
}

export type DetailReportData = {
  footTraffic: FootTrafficData | null
  residentPopulation: ResidentPopulation | null
  weekdayWeekendSales: WeekdayWeekendSalesSummary | null
  sectorSalesRanking: SectorSalesRank[]
  competition: CompetitionStats | null
  commercialChangeIndicator: CommercialChangeIndicator | null
  dataQuality: DetailDataQuality
  franchiseRecommendations: MarketFranchiseRecommendation[]
}
