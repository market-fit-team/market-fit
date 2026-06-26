package com.eodigage.market.api.industry;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eodigage.market.api.common.ApiResponse;
import com.eodigage.market.api.industry.dto.IndustryCategoriesResponse;
import com.eodigage.market.application.industry.MarketIndustryQueryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

/** 상권분석 업종 목록 API. */
@RestController
@RequestMapping("/api/v1/market-industries")
@RequiredArgsConstructor
@Tag(name = "market-industry")
public class MarketIndustryController {

    private final MarketIndustryQueryService marketIndustryQueryService;

    @GetMapping
    @Operation(
            operationId = "getMarketIndustries",
            summary = "Get all commercial-district industries grouped by large category (외식/서비스/도소매)"
    )
    public ApiResponse<IndustryCategoriesResponse> getIndustries() {
        return ApiResponse.success(marketIndustryQueryService.getIndustryCategories());
    }
}
