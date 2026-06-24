package com.eodigage.market.api.report.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "상권분석 미리보기 데이터")
public record MarketReportPreviewResponse(
        List<MarketReportResponse.SalesRankingItem> industryRankings
) {
}
