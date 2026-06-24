package com.eodigage.market.application.adminarea;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.eodigage.market.api.adminarea.dto.AdminAreaFeatureCollectionResponse;
import com.eodigage.market.api.adminarea.dto.AdminAreaFeatureCollectionResponse.AdminAreaFeature;
import com.eodigage.market.api.adminarea.dto.AdminAreaFeatureCollectionResponse.AdminAreaProperties;
import com.eodigage.market.api.adminarea.dto.AdminAreaHierarchyResponse;
import com.eodigage.market.api.adminarea.dto.AdminAreaHierarchyResponse.AreaProperties;
import com.eodigage.market.api.adminarea.dto.AdminAreaHierarchyResponse.DongArea;
import com.eodigage.market.api.adminarea.dto.AdminAreaHierarchyResponse.SigunguArea;
import com.eodigage.market.infrastructure.persistence.adminarea.MarketAdminAreaJdbcRepository;
import com.eodigage.market.infrastructure.persistence.adminarea.MarketAdminAreaJdbcRepository.AdminAreaBoundaryRow;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketAdminAreaQueryService {

    private final MarketAdminAreaJdbcRepository marketAdminAreaJdbcRepository;
    private final ObjectMapper objectMapper;

    public AdminAreaFeatureCollectionResponse getSigunguBoundaries() {
        return toFeatureCollection(marketAdminAreaJdbcRepository.findSigunguBoundaries());
    }

    public AdminAreaFeatureCollectionResponse getDongBoundaries(String sigunguCode) {
        return toFeatureCollection(marketAdminAreaJdbcRepository.findDongBoundaries(sigunguCode));
    }

    public AdminAreaHierarchyResponse getAdminAreas() {
        List<AdminAreaBoundaryRow> sigunguRows = marketAdminAreaJdbcRepository.findSigunguBoundaries();
        List<AdminAreaBoundaryRow> dongRows = marketAdminAreaJdbcRepository.findDongBoundaries(null);
        Map<String, List<DongArea>> dongsBySigunguCode = dongRows.stream()
                .map(this::toDongArea)
                .collect(Collectors.groupingBy(dong -> dong.properties().sigunguCode()));

        List<SigunguArea> sigunguAreas = sigunguRows.stream()
                .map(row -> toSigunguArea(
                        row,
                        dongsBySigunguCode.getOrDefault(row.sigunguCode(), List.of())
                ))
                .toList();

        return new AdminAreaHierarchyResponse(sigunguAreas);
    }

    private AdminAreaFeatureCollectionResponse toFeatureCollection(
            List<AdminAreaBoundaryRow> rows
    ) {
        List<AdminAreaFeature> features = rows.stream()
                .map(this::toFeature)
                .toList();

        return AdminAreaFeatureCollectionResponse.of(features);
    }

    private AdminAreaFeature toFeature(AdminAreaBoundaryRow row) {
        AdminAreaProperties properties = new AdminAreaProperties(
                row.areaType(),
                row.code(),
                row.name(),
                row.sigunguCode(),
                row.sigunguName(),
                row.baseDate(),
                row.centerLat(),
                row.centerLng()
        );

        return AdminAreaFeature.of(properties, parseGeometry(row.geometryJson()));
    }

    private SigunguArea toSigunguArea(AdminAreaBoundaryRow row, List<DongArea> dongs) {
        return new SigunguArea(toAreaProperties(row), parseGeometry(row.geometryJson()), dongs);
    }

    private DongArea toDongArea(AdminAreaBoundaryRow row) {
        return new DongArea(toAreaProperties(row), parseGeometry(row.geometryJson()));
    }

    private AreaProperties toAreaProperties(AdminAreaBoundaryRow row) {
        return new AreaProperties(
                row.areaType(),
                row.code(),
                row.name(),
                row.sigunguCode(),
                row.sigunguName(),
                row.baseDate(),
                row.centerLat(),
                row.centerLng()
        );
    }

    private JsonNode parseGeometry(String geometryJson) {
        if (geometryJson == null || geometryJson.isBlank()) {
            return null;
        }

        try {
            return objectMapper.readTree(geometryJson);
        } catch (JsonProcessingException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Stored boundary GeoJSON is invalid.",
                    exception
            );
        }
    }
}
