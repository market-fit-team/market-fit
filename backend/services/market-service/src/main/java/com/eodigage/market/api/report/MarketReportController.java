package com.eodigage.market.api.report;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eodigage.market.api.common.ApiResponse;
import com.eodigage.market.api.report.dto.MarketReportPreviewResponse;
import com.eodigage.market.api.report.dto.MarketReportResponse;
import com.eodigage.market.application.report.MarketReportQueryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/market-reports")
@RequiredArgsConstructor
@Tag(name = "market-reports")
public class MarketReportController {

    private final MarketReportQueryService marketReportQueryService;

    @GetMapping("/dongs/{dongCode}")
    @Operation(
            operationId = "getMarketReportByDong",
            summary = "Get market detail report data by administrative dong"
    )
    public ApiResponse<MarketReportResponse> getMarketReportByDong(
            @PathVariable String dongCode,
            @RequestParam(defaultValue = "latest") String period
    ) {
        return ApiResponse.success(marketReportQueryService.getReport(dongCode, period));
    }

    @GetMapping("/dongs/{dongCode}/preview")
    @Operation(
            operationId = "getMarketReportPreviewByDong",
            summary = "Get market report preview rankings by administrative dong"
    )
    public ApiResponse<MarketReportPreviewResponse> getMarketReportPreviewByDong(
            @PathVariable String dongCode,
            @RequestParam(defaultValue = "latest") String period
    ) {
        return ApiResponse.success(marketReportQueryService.getPreview(dongCode, period));
    }
}
