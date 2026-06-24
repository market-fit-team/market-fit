package com.eodigage.market.api.search.dto;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "상권(행정동) 검색 결과. 이름 검색과 업종 필터를 하나의 엔드포인트에서 처리한다.")
public record AreaSearchResponse(
        @Schema(description = "이름 검색 키워드(시군구명/행정동명). 미사용 시 null")
        String keyword,
        @Schema(description = "업종 필터 코드. 미사용 시 null")
        String industryCode,
        @Schema(description = "업종 필터 코드명. 업종 필터 미사용 시 null")
        String industryName,
        @Schema(description = "업종 필터 기준 분기 key. 업종 필터 미사용 시 null")
        String periodKey,
        @Schema(description = "업종 필터 기준 분기(stdr_yyqu_cd). 업종 필터 미사용 시 null")
        String stdrYyquCd,
        @Schema(description = "업종 필터 상위 순위 기준(최대 3). 업종 필터 미사용 시 null")
        Integer maxRank,
        List<AreaItem> areas
) {

    @Schema(description = "검색된 행정동 항목")
    public record AreaItem(
            String dongCode,
            String dongName,
            String sigunguCode,
            String sigunguName,
            BigDecimal centerLat,
            BigDecimal centerLng,
            @Schema(description = "rank/estimatedSalesAmount가 가리키는 업종 코드. "
                    + "업종 필터 시 필터 업종, 이름 검색 시 해당 동의 추정매출 1위 업종")
            String industryCode,
            @Schema(description = "rank/estimatedSalesAmount가 가리키는 업종명")
            String industryName,
            @Schema(description = "해당 업종의 추정매출 순위. 이름 검색 시 1위 업종이므로 1. 매출 데이터가 없으면 null")
            Integer rank,
            @Schema(description = "해당 업종의 추정매출액. 매출 데이터가 없으면 null")
            Long estimatedSalesAmount
    ) {
    }
}
