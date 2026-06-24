package com.eodigage.market.api.adminarea;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.eodigage.market.api.common.ApiResponse;
import com.eodigage.market.api.adminarea.dto.AdminAreaFeatureCollectionResponse;
import com.eodigage.market.api.adminarea.dto.AdminAreaHierarchyResponse;
import com.eodigage.market.application.adminarea.MarketAdminAreaQueryService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/admin-areas")
@RequiredArgsConstructor
@Tag(name = "admin-areas")
public class MarketAdminAreaController {

    private final MarketAdminAreaQueryService marketAdminAreaQueryService;

    @GetMapping
    @Operation(
            operationId = "getAdminAreas",
            summary = "Get sigungu boundaries with nested administrative dong boundaries"
    )
    public ApiResponse<AdminAreaHierarchyResponse> getAdminAreas() {
        return ApiResponse.success(marketAdminAreaQueryService.getAdminAreas());
    }
}
