package com.eodigage.market.api.adminarea.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Administrative areas grouped by sigungu with dong boundaries")
public record AdminAreaHierarchyResponse(
        List<SigunguArea> sigungu
) {

    public record SigunguArea(
            AreaProperties properties,
            JsonNode geometry,
            List<DongArea> dongs
    ) {
    }

    public record DongArea(
            AreaProperties properties,
            JsonNode geometry
    ) {
    }

    public record AreaProperties(
            String areaType,
            String code,
            String name,
            String sigunguCode,
            String sigunguName,
            String baseDate,
            BigDecimal centerLat,
            BigDecimal centerLng
    ) {
    }
}
