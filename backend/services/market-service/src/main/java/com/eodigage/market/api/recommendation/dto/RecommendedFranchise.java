package com.eodigage.market.api.recommendation.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 상권 1위 업종 기반 추천 프랜차이즈 브랜드(추정매출 내림차순).
 *
 * <p>franchise-service에서 가져온 브랜드 정보를 표시용으로 추린 것이다.
 * 금액 단위는 공정위 원천 그대로 천원(1,000원).
 */
@Schema(description = "추천 프랜차이즈 브랜드(추정매출 내림차순)")
public record RecommendedFranchise(
        String brandCode,
        String brandName,
        String companyName,
        @Schema(description = "가맹점 평균 추정매출(천원/년)") Long estimatedSalesAmount,
        @Schema(description = "예상 창업비용 합계(천원)") Long startupCostTotal,
        @Schema(description = "가맹점 수") Integer franchiseCount
) {
}
