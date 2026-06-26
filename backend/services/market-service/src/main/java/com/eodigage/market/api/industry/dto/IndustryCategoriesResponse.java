package com.eodigage.market.api.industry.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 대분류(외식/서비스/도소매)별 상권분석 업종 목록 응답.
 *
 * <p>대분류는 업종코드 접두(CS1/CS2/CS3)로 구분한다.
 */
@Schema(description = "대분류별 상권분석 업종 목록")
public record IndustryCategoriesResponse(
        List<Category> categories
) {

    @Schema(description = "업종 대분류")
    public record Category(
            @Schema(description = "대분류 코드(업종코드 접두)", example = "CS1") String categoryCode,
            @Schema(description = "대분류명", example = "외식") String categoryName,
            List<IndustryItem> industries
    ) {
    }

    @Schema(description = "업종")
    public record IndustryItem(
            @Schema(description = "업종코드", example = "CS100001") String code,
            @Schema(description = "업종명", example = "한식음식점") String name
    ) {
    }
}
