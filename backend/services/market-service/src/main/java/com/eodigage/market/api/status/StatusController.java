package com.eodigage.market.api.status;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eodigage.market.api.common.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/v1/status")
@Tag(name = "market")
public class StatusController {

    @GetMapping
    @Operation(operationId = "getMarketServiceStatus", summary = "Get market service status")
    public ApiResponse<StatusResponse> getStatus() {
        return ApiResponse.success(new StatusResponse("market-service", true));
    }

    public record StatusResponse(String service, boolean ok) {
    }
}
