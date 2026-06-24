package com.eodigage.market.infrastructure.persistence.search;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MarketSearchJdbcRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    /**
     * 시군구명 또는 행정동명으로 report 호환 행정동 목록을 검색한다.
     *
     * <p>- 시군구명 부분일치(예: "도봉구") -> 해당 구의 행정동 전체
     * <p>- 행정동명 정규화 부분일치(예: "명일동"/"명일" -> 명일1동, 명일2동) -> 숫자/공백/가운뎃점 제거 후 비교
     *
     * <p>지도에서 선택 가능한 현행 경계(boundary IS NOT NULL)만 대상으로 하며,
     * 표시 코드/명은 상권상세 리포트와 동일한 alias 규칙(개포3동, 상일동)을 적용한다.
     *
     * <p>각 동마다 {@code periodId} 기준 추정매출 1위 업종(코드/명/금액)을 함께 채운다.
     * {@code periodId}가 null이거나 매출 데이터가 없으면 업종 필드는 null이다.
     */
    public List<AreaRow> searchAreasByName(String keyword, Long periodId) {
        String sql = """
                WITH display_alias(boundary_dong_code, display_code, display_name) AS (
                    VALUES
                        ('11680511', '11680511', '개포3동'),
                        ('11740760', '11740520', '상일동'),
                        ('11740770', '11740520', '상일동')
                ),
                analysis_top AS (
                    SELECT DISTINCT ON (d.adm_dr_cd)
                        d.adm_dr_cd AS analysis_code,
                        d.adm_dr_nm AS analysis_name,
                        substring(d.adm_dr_cd from 1 for 5) AS sigungu_prefix,
                        i.svc_induty_cd AS industry_code,
                        i.svc_induty_cd_nm AS industry_name,
                        r.thsmon_selng_amt AS estimated_sales_amount
                    FROM market_industry_sales_rank r
                    JOIN market_admin_dongs d ON d.id = r.dong_id
                    JOIN market_service_industries i ON i.id = r.industry_id
                    WHERE r.period_id = :periodId
                      AND r.sales_amount_rank = 1
                    ORDER BY d.adm_dr_cd, r.thsmon_selng_amt DESC NULLS LAST
                ),
                report_dong AS (
                    SELECT
                        COALESCE(a.display_code, d.adm_dr_cd) AS code,
                        COALESCE(a.display_name, d.adm_dr_nm) AS name,
                        s.sigungu_cd AS sigungu_code,
                        s.sigungu_nm AS sigungu_name,
                        AVG(d.center_lat)::numeric(10, 7) AS center_lat,
                        AVG(d.center_lng)::numeric(10, 7) AS center_lng
                    FROM market_admin_dong_boundaries d
                    LEFT JOIN display_alias a ON a.boundary_dong_code = d.adm_dr_cd
                    LEFT JOIN market_admin_sigungu s ON s.id = d.sigungu_id
                    WHERE d.boundary IS NOT NULL
                    GROUP BY
                        COALESCE(a.display_code, d.adm_dr_cd),
                        COALESCE(a.display_name, d.adm_dr_nm),
                        s.sigungu_cd,
                        s.sigungu_nm
                )
                SELECT rd.code, rd.name, rd.sigungu_code, rd.sigungu_name,
                       rd.center_lat, rd.center_lng,
                       ti.industry_code, ti.industry_name, ti.estimated_sales_amount
                FROM report_dong rd
                LEFT JOIN LATERAL (
                    SELECT a.industry_code, a.industry_name, a.estimated_sales_amount
                    FROM analysis_top a
                    WHERE a.analysis_code = CASE rd.code WHEN '11680511' THEN '11680740' ELSE rd.code END
                       OR (
                            a.sigungu_prefix = rd.sigungu_code
                            AND translate(a.analysis_name, ' ?・·ㆍ.-', '')
                                = translate(rd.name, ' ?・·ㆍ.-', '')
                       )
                    ORDER BY
                        CASE WHEN a.analysis_code
                                  = CASE rd.code WHEN '11680511' THEN '11680740' ELSE rd.code END
                             THEN 0 ELSE 1 END,
                        a.estimated_sales_amount DESC NULLS LAST
                    LIMIT 1
                ) ti ON true
                WHERE rd.sigungu_name LIKE '%' || :keyword || '%'
                   OR regexp_replace(rd.name, '[0-9 ·ㆍ]', '', 'g')
                          LIKE '%' || regexp_replace(:keyword, '[0-9 ·ㆍ]', '', 'g') || '%'
                ORDER BY rd.sigungu_code NULLS LAST, rd.code
                """;

        return jdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("keyword", keyword.trim())
                        .addValue("periodId", periodId),
                areaRowMapper()
        );
    }

    public Optional<IndustryRow> findIndustryByCode(String industryCode) {
        String sql = """
                SELECT id, svc_induty_cd, svc_induty_cd_nm
                FROM market_service_industries
                WHERE svc_induty_cd = :industryCode
                """;

        return findOne(
                sql,
                Map.of("industryCode", industryCode),
                (rs, rowNum) -> new IndustryRow(
                        rs.getLong("id"),
                        rs.getString("svc_induty_cd"),
                        rs.getString("svc_induty_cd_nm")
                )
        );
    }

    public Optional<PeriodRow> findLatestSalesPeriod() {
        String sql = """
                SELECT p.id, p.period_key, p.stdr_yyqu_cd
                FROM market_metric_periods p
                WHERE EXISTS (
                    SELECT 1 FROM market_industry_sales s WHERE s.period_id = p.id
                )
                ORDER BY p.stdr_yyqu_cd DESC
                LIMIT 1
                """;

        return findOne(sql, Map.of(), periodRowMapper());
    }

    public Optional<PeriodRow> findPeriodByStdrYyquCd(String stdrYyquCd) {
        String sql = """
                SELECT id, period_key, stdr_yyqu_cd
                FROM market_metric_periods
                WHERE stdr_yyqu_cd = :stdrYyquCd
                """;

        return findOne(sql, Map.of("stdrYyquCd", stdrYyquCd), periodRowMapper());
    }

    /**
     * 지정한 기준분기에서 해당 업종의 추정매출 순위가 maxRank 이내인 행정동 목록을 조회한다.
     * keyword가 있으면 시군구명/행정동명(정규화 부분일치)으로 추가 필터링한다.
     * 표시 코드/명은 상권상세 리포트와 동일한 alias 규칙(분석동 -> 표시동)을 적용한다.
     */
    public List<IndustryAreaRow> findTopAreasByIndustry(
            Long periodId,
            Long industryId,
            int maxRank,
            String keyword
    ) {
        String sql = """
                WITH display_alias(analysis_code, display_code, display_name) AS (
                    VALUES
                        ('11680740', '11680511', '개포3동'),
                        ('11740520', '11740520', '상일동')
                )
                SELECT
                    COALESCE(da.display_code, d.adm_dr_cd) AS code,
                    COALESCE(da.display_name, d.adm_dr_nm) AS name,
                    s.sigungu_cd AS sigungu_code,
                    s.sigungu_nm AS sigungu_name,
                    b.center_lat,
                    b.center_lng,
                    r.sales_amount_rank AS rank,
                    r.thsmon_selng_amt AS estimated_sales_amount
                FROM market_industry_sales_rank r
                JOIN market_admin_dongs d ON d.id = r.dong_id
                LEFT JOIN display_alias da ON da.analysis_code = d.adm_dr_cd
                LEFT JOIN market_admin_dong_boundaries b
                    ON b.adm_dr_cd = COALESCE(da.display_code, d.adm_dr_cd)
                LEFT JOIN market_admin_sigungu s ON s.id = d.sigungu_id
                WHERE r.period_id = :periodId
                  AND r.industry_id = :industryId
                  AND r.sales_amount_rank <= :maxRank
                  AND (
                        CAST(:keyword AS varchar) IS NULL
                        OR s.sigungu_nm LIKE '%' || :keyword || '%'
                        OR regexp_replace(COALESCE(da.display_name, d.adm_dr_nm), '[0-9 ·ㆍ]', '', 'g')
                               LIKE '%' || regexp_replace(:keyword, '[0-9 ·ㆍ]', '', 'g') || '%'
                  )
                ORDER BY r.sales_amount_rank, r.thsmon_selng_amt DESC NULLS LAST, code
                """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("periodId", periodId)
                .addValue("industryId", industryId)
                .addValue("maxRank", maxRank)
                .addValue("keyword", keyword);

        return jdbcTemplate.query(sql, params, industryAreaRowMapper());
    }

    private <T> Optional<T> findOne(String sql, Map<String, ?> params, RowMapper<T> rowMapper) {
        List<T> rows = jdbcTemplate.query(sql, params, rowMapper);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(rows.get(0));
    }

    private RowMapper<AreaRow> areaRowMapper() {
        return (rs, rowNum) -> new AreaRow(
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("sigungu_code"),
                rs.getString("sigungu_name"),
                rs.getBigDecimal("center_lat"),
                rs.getBigDecimal("center_lng"),
                rs.getString("industry_code"),
                rs.getString("industry_name"),
                getLong(rs.getObject("estimated_sales_amount"))
        );
    }

    private RowMapper<PeriodRow> periodRowMapper() {
        return (rs, rowNum) -> new PeriodRow(
                rs.getLong("id"),
                rs.getString("period_key"),
                rs.getString("stdr_yyqu_cd")
        );
    }

    private RowMapper<IndustryAreaRow> industryAreaRowMapper() {
        return (rs, rowNum) -> new IndustryAreaRow(
                rs.getString("code"),
                rs.getString("name"),
                rs.getString("sigungu_code"),
                rs.getString("sigungu_name"),
                rs.getBigDecimal("center_lat"),
                rs.getBigDecimal("center_lng"),
                getInteger(rs.getObject("rank")),
                getLong(rs.getObject("estimated_sales_amount"))
        );
    }

    private Long getLong(Object value) {
        if (value == null) {
            return null;
        }
        return ((Number) value).longValue();
    }

    private Integer getInteger(Object value) {
        if (value == null) {
            return null;
        }
        return ((Number) value).intValue();
    }

    public record AreaRow(
            String code,
            String name,
            String sigunguCode,
            String sigunguName,
            BigDecimal centerLat,
            BigDecimal centerLng,
            String industryCode,
            String industryName,
            Long estimatedSalesAmount
    ) {
    }

    public record PeriodRow(
            Long id,
            String periodKey,
            String stdrYyquCd
    ) {
    }

    public record IndustryRow(
            Long id,
            String code,
            String name
    ) {
    }

    public record IndustryAreaRow(
            String code,
            String name,
            String sigunguCode,
            String sigunguName,
            BigDecimal centerLat,
            BigDecimal centerLng,
            Integer rank,
            Long estimatedSalesAmount
    ) {
    }
}
