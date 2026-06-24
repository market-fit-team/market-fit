package com.eodigage.market.api.search;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eodigage.market.api.common.ApiResponse;
import com.eodigage.market.api.search.dto.AreaSearchResponse;
import com.eodigage.market.application.search.MarketSearchQueryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/market-search")
@RequiredArgsConstructor
@Tag(name = "market-search")
public class MarketSearchController {

    private final MarketSearchQueryService marketSearchQueryService;

    @GetMapping("/areas")
    @Operation(
            operationId = "searchAreas",
            summary = "Search dongs by name keyword and/or industry estimated-sales top rank filter"
    )
    public ApiResponse<AreaSearchResponse> searchAreas(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String industryCode,
            @RequestParam(defaultValue = "latest") String period,
            @RequestParam(defaultValue = "3") @Min(1) @Max(3) int maxRank
    ) {
        return ApiResponse.success(
                marketSearchQueryService.searchAreas(keyword, industryCode, period, maxRank)
        );
    }
}
