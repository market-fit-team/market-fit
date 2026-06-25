import {
  type IndustryMajorOption,
  industryFilterOptions,
} from "@/features/map/lib/industry-filter-options"
import {
  toAdminAreaMapData,
  toDetailReportData,
  toMarketAreaSearchResult,
  toMarketPreviewData,
} from "@/features/map/lib/map-api-mappers"
import { fetchPublicMarketApi } from "@/features/map/lib/map-public-fetch"
import type {
  DongCode,
  MarketRecommendedArea,
  MarketScrapTarget,
} from "@/features/map/types/map"
import { getGetAdminAreasUrl } from "@/shared/api/generated/market/endpoints/admin-areas/admin-areas"
import {
  getGetMarketReportByDongUrl,
  getGetMarketReportPreviewByDongUrl,
} from "@/shared/api/generated/market/endpoints/market-reports/market-reports"
import { getSearchAreasUrl } from "@/shared/api/generated/market/endpoints/market-search/market-search"
import type {
  ApiResponseAdminAreaHierarchyResponse,
  ApiResponseAreaSearchResponse,
  ApiResponseMarketReportPreviewResponse,
  ApiResponseMarketReportResponse,
} from "@/shared/api/generated/market/schemas"

export const getAdminAreas = async () =>
  toAdminAreaMapData(
    (
      await fetchPublicMarketApi<ApiResponseAdminAreaHierarchyResponse>(
        getGetAdminAreasUrl()
      )
    ).data
  )

export const getMarketPreview = async (dongCode: DongCode) =>
  toMarketPreviewData(
    (
      await fetchPublicMarketApi<ApiResponseMarketReportPreviewResponse>(
        getGetMarketReportPreviewByDongUrl(dongCode)
      )
    ).data
  )

export const getMarketReport = async (dongCode: DongCode) =>
  toDetailReportData(
    (
      await fetchPublicMarketApi<ApiResponseMarketReportResponse>(
        getGetMarketReportByDongUrl(dongCode)
      )
    ).data ?? {}
  )

export const searchMarketAreas = async (params: {
  industryCode?: string
  keyword?: string
}) =>
  toMarketAreaSearchResult(
    (
      await fetchPublicMarketApi<ApiResponseAreaSearchResponse>(
        getSearchAreasUrl({
          industryCode: params.industryCode,
          keyword: params.keyword,
        })
      )
    ).data
  )

// TODO: market OpenAPI에 업종 목록 endpoint가 추가되면 Orval 생성 함수로 교체한다.
export const getMarketIndustries = async (): Promise<IndustryMajorOption[]> =>
  industryFilterOptions

// TODO: market OpenAPI에 추천 목록 endpoint가 추가되면 Orval 생성 함수로 교체한다.
export const getMarketRecommendedAreas = async (): Promise<
  MarketRecommendedArea[]
> => []

// TODO: 상권(행정동)·프랜차이즈 스크랩 API가 추가되면 실제 Orval mutation으로 연결한다.
export const scrapMarketTarget = async (
  target: MarketScrapTarget
): Promise<MarketScrapTarget> => target
