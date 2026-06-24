import type { DistrictData } from "@/features/startup/lib/data"

export type TradeAreaId = DistrictData["id"]

export type MapTab = "franchises" | "sales"

export type BudgetRange = "all" | "low" | "high"

export type TargetDemographic = "all" | "20" | "30" | "50"

export type DongCode = string

export type MapFocusRequest = {
  dongCode: DongCode
  requestId: number
}

export type HourlyFootTraffic = {
  hour: string
  value: number
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

export type SectorWeekdayWeekendSales = {
  sector: string
  weekday: number
  weekend: number
}

export type SectorSalesRank = {
  rank: number
  sector: string
  estimatedSales: number
  qoqChange: number
  storeCount: number
  salesPerStore: number
}

export type CompetitionStats = {
  storeCount: number
  franchiseStoreCount: number
  openCount: number
  closeCount: number
}

export type CommercialChangeIndicator = {
  code: "HH" | "HL" | "LH" | "LL"
  label: string
  description: string
}

export type DetailReportData = {
  footTraffic: HourlyFootTraffic[]
  residentPopulation: ResidentPopulation
  sectorWeekdayWeekendSales: SectorWeekdayWeekendSales[]
  sectorSalesRanking: SectorSalesRank[]
  competition: CompetitionStats
  commercialChangeIndicator: CommercialChangeIndicator
}
