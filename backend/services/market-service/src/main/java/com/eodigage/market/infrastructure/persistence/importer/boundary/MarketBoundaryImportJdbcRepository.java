package com.eodigage.market.infrastructure.persistence.importer.boundary;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MarketBoundaryImportJdbcRepository {

    private static final String DEFAULT_BASE_DATE = "00000000";
    private static final double SIMPLIFY_TOLERANCE = 0.0005;

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public Long upsertDataSource(String sourceCode, String sourceName) {
        String sql = """
                INSERT INTO market_data_sources (
                    source_code, source_name, provider, source_url, api_name, description
                )
                VALUES (
                    :sourceCode, :sourceName, 'local-shp', :sourceUrl, :sourceName,
                    'Local shapefile import from backend/data'
                )
                ON CONFLICT (source_code) DO UPDATE SET
                    source_name = EXCLUDED.source_name,
                    source_url = EXCLUDED.source_url,
                    updated_at = NOW()
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("sourceCode", sourceCode)
                        .addValue("sourceName", sourceName)
                        .addValue("sourceUrl", "file://backend/data/" + sourceName),
                Long.class
        );
    }

    public Long createIngestBatch(Long sourceId, String requestedPath) {
        String sql = """
                INSERT INTO market_ingest_batches (
                    source_id, requested_path, result_code, result_message
                )
                VALUES (
                    :sourceId, :requestedPath, 'STARTED', 'Boundary shapefile import started'
                )
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("sourceId", sourceId)
                        .addValue("requestedPath", requestedPath),
                Long.class
        );
    }

    public void finishIngestBatch(Long batchId, long fetchedCount) {
        String sql = """
                UPDATE market_ingest_batches
                SET result_code = 'SUCCESS',
                    result_message = 'Boundary shapefile import completed',
                    fetched_count = :fetchedCount
                WHERE id = :batchId
                """;

        jdbcTemplate.update(
                sql,
                new MapSqlParameterSource()
                        .addValue("batchId", batchId)
                        .addValue("fetchedCount", fetchedCount)
        );
    }

    public void deleteAllSigungu() {
        jdbcTemplate.update("DELETE FROM market_admin_sigungu", new MapSqlParameterSource());
    }

    public void assignDongSigunguByCodePrefix() {
        String sql = """
                UPDATE market_admin_dongs d
                SET sigungu_id = s.id,
                    updated_at = NOW()
                FROM market_admin_sigungu s
                WHERE substring(d.adm_dr_cd from 1 for 5) = s.sigungu_cd
                """;

        jdbcTemplate.update(sql, new MapSqlParameterSource());
    }

    public void deleteAllDongBoundaries() {
        jdbcTemplate.update("DELETE FROM market_admin_dong_boundaries", new MapSqlParameterSource());
    }

    public void upsertSigungu(
            Long sourceId,
            Long batchId,
            String baseDate,
            String sigunguCode,
            String sigunguName,
            String wkt,
            String rawPropertiesJson
    ) {
        String normalizeCodeSql = """
                UPDATE market_admin_sigungu target
                SET sigungu_cd = :sigunguCode,
                    updated_at = NOW()
                WHERE target.sigungu_nm = :sigunguName
                  AND target.sigungu_cd <> :sigunguCode
                  AND NOT EXISTS (
                    SELECT 1
                    FROM market_admin_sigungu existing
                    WHERE existing.sigungu_cd = :sigunguCode
                  )
                """;

        jdbcTemplate.update(
                normalizeCodeSql,
                new MapSqlParameterSource()
                        .addValue("sigunguCode", sigunguCode)
                        .addValue("sigunguName", sigunguName)
        );

        String sql = """
                WITH geom AS (
                    SELECT ST_Multi(ST_SetSRID(ST_GeomFromText(:wkt), 4326)) AS boundary
                ),
                normalized AS (
                    SELECT
                        boundary,
                        ST_PointOnSurface(boundary) AS center_point,
                        ST_AsGeoJSON(boundary)::jsonb AS boundary_geojson,
                        ST_AsGeoJSON(ST_SimplifyPreserveTopology(boundary, :tolerance))::jsonb
                            AS boundary_simplified_geojson
                    FROM geom
                )
                INSERT INTO market_admin_sigungu (
                    base_date, sigungu_cd, sigungu_nm,
                    source_id, ingest_batch_id, center_lat, center_lng,
                    boundary, boundary_geojson, boundary_simplified_geojson,
                    center_point, raw_properties_json
                )
                SELECT
                    COALESCE(:baseDate, :defaultBaseDate), :sigunguCode, :sigunguName,
                    :sourceId, :batchId, ST_Y(center_point), ST_X(center_point),
                    boundary, boundary_geojson, boundary_simplified_geojson,
                    center_point, CAST(:rawPropertiesJson AS jsonb)
                FROM normalized
                ON CONFLICT (sigungu_cd) DO UPDATE SET
                    base_date = EXCLUDED.base_date,
                    sigungu_nm = EXCLUDED.sigungu_nm,
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    center_lat = EXCLUDED.center_lat,
                    center_lng = EXCLUDED.center_lng,
                    boundary = EXCLUDED.boundary,
                    boundary_geojson = EXCLUDED.boundary_geojson,
                    boundary_simplified_geojson = EXCLUDED.boundary_simplified_geojson,
                    center_point = EXCLUDED.center_point,
                    raw_properties_json = EXCLUDED.raw_properties_json,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(
                sql,
                baseParams(sourceId, batchId, baseDate, wkt, rawPropertiesJson)
                        .addValue("sigunguCode", sigunguCode)
                        .addValue("sigunguName", sigunguName)
        );
    }

    public void upsertDong(
            Long sourceId,
            Long batchId,
            String baseDate,
            String dongCode,
            String dongName,
            String wkt,
            String rawPropertiesJson
    ) {
        String sql = """
                WITH geom AS (
                    SELECT ST_Multi(ST_SetSRID(ST_GeomFromText(:wkt), 4326)) AS boundary
                ),
                normalized AS (
                    SELECT
                        boundary,
                        ST_PointOnSurface(boundary) AS center_point,
                        ST_AsGeoJSON(boundary)::jsonb AS boundary_geojson,
                        ST_AsGeoJSON(ST_SimplifyPreserveTopology(boundary, :tolerance))::jsonb
                            AS boundary_simplified_geojson
                    FROM geom
                )
                INSERT INTO market_admin_dong_boundaries (
                    base_date, adm_dr_cd, adm_dr_nm, sigungu_id,
                    source_id, ingest_batch_id, center_lat, center_lng,
                    boundary, boundary_geojson, boundary_simplified_geojson,
                    center_point, raw_properties_json
                )
                SELECT
                    COALESCE(:baseDate, :defaultBaseDate), :dongCode, :dongName,
                    (
                        SELECT id
                        FROM market_admin_sigungu
                        WHERE sigungu_cd = substring(:dongCode from 1 for 5)
                        LIMIT 1
                    ),
                    :sourceId, :batchId, ST_Y(center_point), ST_X(center_point),
                    boundary, boundary_geojson, boundary_simplified_geojson,
                    center_point, CAST(:rawPropertiesJson AS jsonb)
                FROM normalized
                ON CONFLICT (adm_dr_cd) DO UPDATE SET
                    base_date = EXCLUDED.base_date,
                    adm_dr_nm = EXCLUDED.adm_dr_nm,
                    sigungu_id = COALESCE(EXCLUDED.sigungu_id, market_admin_dong_boundaries.sigungu_id),
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    center_lat = EXCLUDED.center_lat,
                    center_lng = EXCLUDED.center_lng,
                    boundary = EXCLUDED.boundary,
                    boundary_geojson = EXCLUDED.boundary_geojson,
                    boundary_simplified_geojson = EXCLUDED.boundary_simplified_geojson,
                    center_point = EXCLUDED.center_point,
                    raw_properties_json = EXCLUDED.raw_properties_json,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(
                sql,
                baseParams(sourceId, batchId, baseDate, wkt, rawPropertiesJson)
                        .addValue("dongCode", dongCode)
                        .addValue("dongName", dongName)
        );
    }

    private MapSqlParameterSource baseParams(
            Long sourceId,
            Long batchId,
            String baseDate,
            String wkt,
            String rawPropertiesJson
    ) {
        return new MapSqlParameterSource()
                .addValue("sourceId", sourceId)
                .addValue("batchId", batchId)
                .addValue("baseDate", baseDate)
                .addValue("defaultBaseDate", DEFAULT_BASE_DATE)
                .addValue("wkt", wkt)
                .addValue("rawPropertiesJson", rawPropertiesJson)
                .addValue("tolerance", SIMPLIFY_TOLERANCE);
    }
}
