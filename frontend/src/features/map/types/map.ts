import type { DistrictData } from "@/features/startup/lib/data"

export type TradeAreaId = DistrictData["id"]

export type MapTab = "sectors" | "demographics" | "traffic"

export type BudgetRange = "all" | "low" | "high"

export type TargetDemographic = "all" | "20" | "30" | "50"

export type DongCode = string