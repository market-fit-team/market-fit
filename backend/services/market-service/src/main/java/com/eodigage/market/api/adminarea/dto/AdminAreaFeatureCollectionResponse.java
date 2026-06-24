package com.eodigage.market.api.adminarea.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Administrative area boundary GeoJSON FeatureCollection")
public record AdminAreaFeatureCollectionResponse(
        String type,
        List<AdminAreaFeature> features
) {

    public static AdminAreaFeatureCollectionResponse of(List<AdminAreaFeature> features) {
        return new AdminAreaFeatureCollectionResponse("FeatureCollection", features);
    }

    public record AdminAreaFeature(
            String type,
            AdminAreaProperties properties,
            JsonNode geometry
    ) {

        public static AdminAreaFeature of(
                AdminAreaProperties properties,
                JsonNode geometry
        ) {
            return new AdminAreaFeature("Feature", properties, geometry);
        }
    }

    public record AdminAreaProperties(
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
