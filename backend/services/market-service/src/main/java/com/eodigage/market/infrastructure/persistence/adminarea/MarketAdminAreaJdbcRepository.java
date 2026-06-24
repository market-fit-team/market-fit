package com.eodigage.market.infrastructure.persistence.adminarea;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MarketAdminAreaJdbcRepository {

    private static final String GEOMETRY_JSON =
            "COALESCE(boundary_simplified_geojson, boundary_geojson)::text AS geometry_json";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public List<AdminAreaBoundaryRow> findSigunguBoundaries() {
        String sql = """
                SELECT 'sigungu' AS area_type,
                       sigungu_cd AS code,
                       sigungu_nm AS name,
                       sigungu_cd AS sigungu_code,
                       sigungu_nm AS sigungu_name,
                       base_date,
                       center_lat,
                       center_lng,
                       %s
                FROM market_admin_sigungu
                ORDER BY sigungu_cd
                """.formatted(GEOMETRY_JSON);

        return jdbcTemplate.query(sql, new MapSqlParameterSource(), boundaryRowMapper());
    }

    public List<AdminAreaBoundaryRow> findDongBoundaries(String sigunguCode) {
        String sql = """
                WITH display_alias(boundary_dong_code, display_code, display_name) AS (
                    VALUES
                        ('11680511', '11680511', '개포3동'),
                        ('11740760', '11740520', '상일동'),
                        ('11740770', '11740520', '상일동')
                ),
                report_boundary AS (
                    SELECT
                        COALESCE(a.display_code, d.adm_dr_cd) AS code,
                        COALESCE(a.display_name, d.adm_dr_nm) AS name,
                        s.sigungu_cd,
                        s.sigungu_nm,
                        MAX(d.base_date) AS base_date,
                        ST_CollectionExtract(
                            ST_UnaryUnion(ST_Collect(d.boundary)),
                            3
                        ) AS boundary
                    FROM market_admin_dong_boundaries d
                    LEFT JOIN display_alias a ON a.boundary_dong_code = d.adm_dr_cd
                    LEFT JOIN market_admin_sigungu s ON s.id = d.sigungu_id
                    WHERE (
                        CAST(:sigunguCode AS varchar) IS NULL
                        OR s.sigungu_cd = CAST(:sigunguCode AS varchar)
                    )
                      AND d.boundary IS NOT NULL
                    GROUP BY
                        COALESCE(a.display_code, d.adm_dr_cd),
                        COALESCE(a.display_name, d.adm_dr_nm),
                        s.sigungu_cd,
                        s.sigungu_nm
                ),
                normalized AS (
                    SELECT
                        code,
                        name,
                        sigungu_cd,
                        sigungu_nm,
                        base_date,
                        ST_PointOnSurface(boundary) AS center_point,
                        boundary
                    FROM report_boundary
                    WHERE boundary IS NOT NULL
                      AND NOT ST_IsEmpty(boundary)
                )
                SELECT 'dong' AS area_type,
                       code,
                       name,
                       sigungu_cd AS sigungu_code,
                       sigungu_nm AS sigungu_name,
                       base_date,
                       ST_Y(center_point)::numeric(10, 7) AS center_lat,
                       ST_X(center_point)::numeric(10, 7) AS center_lng,
                       ST_AsGeoJSON(
                           ST_SimplifyPreserveTopology(boundary, 0.0005)
                       )::text AS geometry_json
                FROM normalized
                ORDER BY sigungu_cd NULLS LAST, code
                """;

        return jdbcTemplate.query(
                sql,
                new MapSqlParameterSource("sigunguCode", blankToNull(sigunguCode)),
                boundaryRowMapper()
        );
    }

    private RowMapper<AdminAreaBoundaryRow> boundaryRowMapper() {
        return (rs, rowNum) -> new AdminAreaBoundaryRow(
                rs.getString("area_type"),
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("sigungu_code"),
                rs.getString("sigungu_name"),
                rs.getString("base_date"),
                rs.getBigDecimal("center_lat"),
                rs.getBigDecimal("center_lng"),
                rs.getString("geometry_json")
        );
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    public record AdminAreaBoundaryRow(
            String areaType,
            String code,
            String name,
            String sigunguCode,
            String sigunguName,
            String baseDate,
            BigDecimal centerLat,
            BigDecimal centerLng,
            String geometryJson
    ) {
    }
}
