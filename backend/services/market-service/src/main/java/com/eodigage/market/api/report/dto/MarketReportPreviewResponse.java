package com.eodigage.market.api.report.dto;

import java.util.List;

import com.eodigage.market.api.recommendation.dto.RecommendedFranchise;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "상권분석 미리보기 데이터")
public record MarketReportPreviewResponse(
        List<MarketReportResponse.SalesRankingItem> industryRankings,
        @Schema(description = "1위 업종 기반 프랜차이즈 추천(추정매출순)")
        List<RecommendedFranchise> franchiseRecommendations
) {
}
