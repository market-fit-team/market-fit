package com.eodigage.market.infrastructure.persistence.report;

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
public class MarketReportJdbcRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public Optional<DongRow> findDongByCode(String dongCode) {
        String sql = """
                WITH analysis_alias(
                    boundary_dong_code,
                    analysis_dong_code,
                    display_dong_code
                ) AS (
                    VALUES
                        ('11680511', '11680740', '11680511'),
                        ('11740760', '11740520', '11740520'),
                        ('11740770', '11740520', '11740520')
                ),
                requested_boundary AS (
                    SELECT id, adm_dr_cd, adm_dr_nm, sigungu_id, center_lat, center_lng
                    FROM market_admin_dong_boundaries
                    WHERE adm_dr_cd = :dongCode
                ),
                alias_boundary AS (
                    SELECT a.analysis_dong_code,
                           a.display_dong_code,
                           MIN(bd.sigungu_id) AS sigungu_id,
                           MAX(bd.adm_dr_nm) FILTER (WHERE bd.adm_dr_cd = a.display_dong_code)
                               AS exact_display_dong_name,
                           ST_PointOnSurface(
                               ST_CollectionExtract(ST_UnaryUnion(ST_Collect(bd.boundary)), 3)
                           ) AS center_point
                    FROM analysis_alias a
                    JOIN market_admin_dong_boundaries bd
                      ON bd.adm_dr_cd = a.boundary_dong_code
                    GROUP BY a.analysis_dong_code, a.display_dong_code
                ),
                candidate AS (
                    SELECT d.id,
                           d.adm_dr_cd,
                           d.adm_dr_nm,
                           COALESCE(aa.display_dong_code, selected.adm_dr_cd, d.adm_dr_cd)
                               AS display_adm_dr_cd,
                           CASE
                               WHEN ab.analysis_dong_code IS NOT NULL
                                AND ab.display_dong_code = d.adm_dr_cd
                               THEN d.adm_dr_nm
                               ELSE COALESCE(ab.exact_display_dong_name, selected.adm_dr_nm, d.adm_dr_nm)
                           END AS display_adm_dr_nm,
                           COALESCE(
                               d.sigungu_id,
                               ab.sigungu_id,
                               b.sigungu_id,
                               rb.sigungu_id,
                               selected.sigungu_id
                           ) AS sigungu_id,
                           COALESCE(
                               ST_Y(ab.center_point),
                               selected.center_lat,
                               b.center_lat,
                               rb.center_lat
                           ) AS center_lat,
                           COALESCE(
                               ST_X(ab.center_point),
                               selected.center_lng,
                               b.center_lng,
                               rb.center_lng
                           ) AS center_lng,
                           CASE
                               WHEN d.adm_dr_cd = :dongCode THEN 0
                               WHEN aa.boundary_dong_code IS NOT NULL THEN 1
                               ELSE 2
                           END AS priority
                    FROM market_admin_dongs d
                    LEFT JOIN analysis_alias aa
                      ON aa.boundary_dong_code = :dongCode
                     AND aa.analysis_dong_code = d.adm_dr_cd
                    LEFT JOIN alias_boundary ab
                      ON ab.analysis_dong_code = d.adm_dr_cd
                     AND ab.display_dong_code = COALESCE(aa.display_dong_code, d.adm_dr_cd)
                    LEFT JOIN market_admin_dong_boundaries b ON b.adm_dr_cd = d.adm_dr_cd
                    LEFT JOIN requested_boundary selected ON TRUE
                    LEFT JOIN requested_boundary rb
                      ON substring(rb.adm_dr_cd from 1 for 5) = substring(d.adm_dr_cd from 1 for 5)
                     AND translate(rb.adm_dr_nm, ' ?・·ㆍ.-', '') = translate(d.adm_dr_nm, ' ?・·ㆍ.-', '')
                    WHERE d.adm_dr_cd = :dongCode
                       OR aa.boundary_dong_code IS NOT NULL
                       OR rb.id IS NOT NULL
                )
                SELECT c.id,
                       c.adm_dr_cd,
                       c.adm_dr_nm,
                       c.display_adm_dr_cd,
                       c.display_adm_dr_nm,
                       s.sigungu_cd,
                       s.sigungu_nm,
                       c.center_lat,
                       c.center_lng
                FROM candidate c
                LEFT JOIN market_admin_sigungu s ON s.id = c.sigungu_id
                ORDER BY c.priority
                LIMIT 1
                """;

        return findOne(sql, Map.of("dongCode", dongCode), dongRowMapper());
    }

    public Optional<PeriodRow> findLatestReportPeriod(Long dongId) {
        String sql = """
                SELECT p.id, p.period_key, p.stdr_yyqu_cd, p.year, p.quarter
                FROM market_metric_periods p
                WHERE EXISTS (
                    SELECT 1 FROM market_floating_populations f
                    WHERE f.period_id = p.id AND f.dong_id = :dongId
                )
                OR EXISTS (
                    SELECT 1 FROM market_resident_populations r
                    WHERE r.period_id = p.id AND r.dong_id = :dongId
                )
                OR EXISTS (
                    SELECT 1 FROM market_industry_sales s
                    WHERE s.period_id = p.id AND s.dong_id = :dongId
                )
                OR EXISTS (
                    SELECT 1 FROM market_industry_stores st
                    WHERE st.period_id = p.id AND st.dong_id = :dongId
                )
                OR EXISTS (
                    SELECT 1 FROM market_trade_area_changes c
                    WHERE c.period_id = p.id AND c.dong_id = :dongId
                )
                ORDER BY p.stdr_yyqu_cd DESC
                LIMIT 1
                """;

        return findOne(sql, Map.of("dongId", dongId), periodRowMapper());
    }

    public Optional<PeriodRow> findPeriodByStdrYyquCd(String stdrYyquCd) {
        String sql = """
                SELECT id, period_key, stdr_yyqu_cd, year, quarter
                FROM market_metric_periods
                WHERE stdr_yyqu_cd = :stdrYyquCd
                """;

        return findOne(sql, Map.of("stdrYyquCd", stdrYyquCd), periodRowMapper());
    }

    public Optional<Long> findPreviousPeriodId(Long periodId) {
        String sql = """
                SELECT previous.id
                FROM market_metric_periods current
                JOIN market_metric_periods previous
                  ON previous.stdr_yyqu_cd < current.stdr_yyqu_cd
                WHERE current.id = :periodId
                ORDER BY previous.stdr_yyqu_cd DESC
                LIMIT 1
                """;

        return findOne(sql, Map.of("periodId", periodId), (rs, rowNum) -> rs.getLong("id"));
    }

    public Optional<FloatingPopulationRow> findFloatingPopulation(Long dongId, Long periodId) {
        String sql = """
                SELECT *
                FROM market_floating_populations
                WHERE dong_id = :dongId
                  AND period_id = :periodId
                """;

        return findOne(
                sql,
                Map.of("dongId", dongId, "periodId", periodId),
                floatingPopulationRowMapper()
        );
    }

    public Optional<ResidentPopulationRow> findResidentPopulation(Long dongId, Long periodId) {
        String sql = """
                SELECT *
                FROM market_resident_populations
                WHERE dong_id = :dongId
                  AND period_id = :periodId
                """;

        return findOne(
                sql,
                Map.of("dongId", dongId, "periodId", periodId),
                residentPopulationRowMapper()
        );
    }

    public Optional<SalesAggregateRow> findIndustrySalesAggregate(Long dongId, Long periodId) {
        String sql = """
                SELECT SUM(thsmon_selng_amt) AS total_sales_amount,
                       SUM(thsmon_selng_co) AS total_sales_count,
                       SUM(mdwk_selng_amt) AS weekday_sales_amount,
                       SUM(wkend_selng_amt) AS weekend_sales_amount
                FROM market_industry_sales
                WHERE dong_id = :dongId
                  AND period_id = :periodId
                """;

        return findOne(
                sql,
                Map.of("dongId", dongId, "periodId", periodId),
                salesAggregateRowMapper()
        );
    }

    public List<IndustrySalesRow> findTopIndustrySalesByAmount(
            Long dongId,
            Long periodId,
            Long previousPeriodId
    ) {
        String sql = """
                SELECT i.svc_induty_cd,
                       i.svc_induty_cd_nm,
                       s.thsmon_selng_amt,
                       s.thsmon_selng_co,
                       s.mdwk_selng_amt,
                       s.wkend_selng_amt,
                       prev.thsmon_selng_amt AS previous_thsmon_selng_amt,
                       st.similr_induty_stor_co
                FROM market_industry_sales s
                JOIN market_service_industries i ON i.id = s.industry_id
                LEFT JOIN market_industry_sales prev
                  ON prev.dong_id = s.dong_id
                 AND prev.industry_id = s.industry_id
                 AND prev.period_id = :previousPeriodId
                LEFT JOIN market_industry_stores st
                  ON st.dong_id = s.dong_id
                 AND st.industry_id = s.industry_id
                 AND st.period_id = s.period_id
                WHERE s.dong_id = :dongId
                  AND s.period_id = :periodId
                ORDER BY s.thsmon_selng_amt DESC NULLS LAST
                LIMIT 3
                """;

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("dongId", dongId)
                .addValue("periodId", periodId)
                .addValue("previousPeriodId", previousPeriodId);

        return jdbcTemplate.query(sql, params, industrySalesRowMapper());
    }

    public List<IndustryStoreRow> findIndustryStores(Long dongId, Long periodId) {
        String sql = """
                SELECT i.svc_induty_cd,
                       i.svc_induty_cd_nm,
                       st.similr_induty_stor_co,
                       st.stor_co,
                       st.frc_stor_co,
                       st.opbiz_rt,
                       st.opbiz_stor_co,
                       st.clsbiz_rt,
                       st.clsbiz_stor_co
                FROM market_industry_stores st
                JOIN market_service_industries i ON i.id = st.industry_id
                WHERE st.dong_id = :dongId
                  AND st.period_id = :periodId
                ORDER BY st.similr_induty_stor_co DESC NULLS LAST
                """;

        return jdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("dongId", dongId)
                        .addValue("periodId", periodId),
                industryStoreRowMapper()
        );
    }

    public Optional<TradeAreaChangeRow> findTradeAreaChange(Long dongId, Long periodId) {
        String sql = """
                SELECT trdar_chnge_ix,
                       trdar_chnge_ix_nm,
                       opr_sale_mt_avrg,
                       cls_sale_mt_avrg,
                       su_opr_sale_mt_avrg,
                       su_cls_sale_mt_avrg
                FROM market_trade_area_changes
                WHERE dong_id = :dongId
                  AND period_id = :periodId
                """;

        return findOne(
                sql,
                Map.of("dongId", dongId, "periodId", periodId),
                tradeAreaChangeRowMapper()
        );
    }

    private <T> Optional<T> findOne(
            String sql,
            Map<String, ?> params,
            RowMapper<T> rowMapper
    ) {
        List<T> rows = jdbcTemplate.query(sql, params, rowMapper);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(rows.get(0));
    }

    private RowMapper<DongRow> dongRowMapper() {
        return (rs, rowNum) -> new DongRow(
                rs.getLong("id"),
                rs.getString("adm_dr_cd"),
                rs.getString("adm_dr_nm"),
                rs.getString("display_adm_dr_cd"),
                rs.getString("display_adm_dr_nm"),
                rs.getString("sigungu_cd"),
                rs.getString("sigungu_nm"),
                rs.getBigDecimal("center_lat"),
                rs.getBigDecimal("center_lng")
        );
    }

    private RowMapper<PeriodRow> periodRowMapper() {
        return (rs, rowNum) -> new PeriodRow(
                rs.getLong("id"),
                rs.getString("period_key"),
                rs.getString("stdr_yyqu_cd"),
                getInteger(rs.getObject("year")),
                getInteger(rs.getObject("quarter"))
        );
    }

    private RowMapper<FloatingPopulationRow> floatingPopulationRowMapper() {
        return (rs, rowNum) -> new FloatingPopulationRow(
                getLong(rs.getObject("tot_flpop_co")),
                getLong(rs.getObject("ml_flpop_co")),
                getLong(rs.getObject("fml_flpop_co")),
                getLong(rs.getObject("agrde_10_flpop_co")),
                getLong(rs.getObject("agrde_20_flpop_co")),
                getLong(rs.getObject("agrde_30_flpop_co")),
                getLong(rs.getObject("agrde_40_flpop_co")),
                getLong(rs.getObject("agrde_50_flpop_co")),
                getLong(rs.getObject("agrde_60_above_flpop_co")),
                getLong(rs.getObject("tmzon_00_06_flpop_co")),
                getLong(rs.getObject("tmzon_06_11_flpop_co")),
                getLong(rs.getObject("tmzon_11_14_flpop_co")),
                getLong(rs.getObject("tmzon_14_17_flpop_co")),
                getLong(rs.getObject("tmzon_17_21_flpop_co")),
                getLong(rs.getObject("tmzon_21_24_flpop_co")),
                getLong(rs.getObject("mon_flpop_co")),
                getLong(rs.getObject("tues_flpop_co")),
                getLong(rs.getObject("wed_flpop_co")),
                getLong(rs.getObject("thur_flpop_co")),
                getLong(rs.getObject("fri_flpop_co")),
                getLong(rs.getObject("sat_flpop_co")),
                getLong(rs.getObject("sun_flpop_co"))
        );
    }

    private RowMapper<ResidentPopulationRow> residentPopulationRowMapper() {
        return (rs, rowNum) -> new ResidentPopulationRow(
                getLong(rs.getObject("tot_repop_co")),
                getLong(rs.getObject("ml_repop_co")),
                getLong(rs.getObject("fml_repop_co")),
                getLong(rs.getObject("agrde_10_repop_co")),
                getLong(rs.getObject("agrde_20_repop_co")),
                getLong(rs.getObject("agrde_30_repop_co")),
                getLong(rs.getObject("agrde_40_repop_co")),
                getLong(rs.getObject("agrde_50_repop_co")),
                getLong(rs.getObject("agrde_60_above_repop_co")),
                getLong(rs.getObject("mag_10_repop_co")),
                getLong(rs.getObject("mag_20_repop_co")),
                getLong(rs.getObject("mag_30_repop_co")),
                getLong(rs.getObject("mag_40_repop_co")),
                getLong(rs.getObject("mag_50_repop_co")),
                getLong(rs.getObject("mag_60_above_repop_co")),
                getLong(rs.getObject("fag_10_repop_co")),
                getLong(rs.getObject("fag_20_repop_co")),
                getLong(rs.getObject("fag_30_repop_co")),
                getLong(rs.getObject("fag_40_repop_co")),
                getLong(rs.getObject("fag_50_repop_co")),
                getLong(rs.getObject("fag_60_above_repop_co")),
                getLong(rs.getObject("tot_hshld_co")),
                getLong(rs.getObject("apt_hshld_co")),
                getLong(rs.getObject("non_apt_hshld_co"))
        );
    }

    private RowMapper<IndustrySalesRow> industrySalesRowMapper() {
        return (rs, rowNum) -> new IndustrySalesRow(
                rs.getString("svc_induty_cd"),
                rs.getString("svc_induty_cd_nm"),
                getLong(rs.getObject("thsmon_selng_amt")),
                getLong(rs.getObject("thsmon_selng_co")),
                getLong(rs.getObject("mdwk_selng_amt")),
                getLong(rs.getObject("wkend_selng_amt")),
                getLong(rs.getObject("previous_thsmon_selng_amt")),
                getLong(rs.getObject("similr_induty_stor_co"))
        );
    }

    private RowMapper<IndustryStoreRow> industryStoreRowMapper() {
        return (rs, rowNum) -> new IndustryStoreRow(
                rs.getString("svc_induty_cd"),
                rs.getString("svc_induty_cd_nm"),
                getLong(rs.getObject("similr_induty_stor_co")),
                getLong(rs.getObject("stor_co")),
                getLong(rs.getObject("frc_stor_co")),
                rs.getBigDecimal("opbiz_rt"),
                getLong(rs.getObject("opbiz_stor_co")),
                rs.getBigDecimal("clsbiz_rt"),
                getLong(rs.getObject("clsbiz_stor_co"))
        );
    }

    private RowMapper<TradeAreaChangeRow> tradeAreaChangeRowMapper() {
        return (rs, rowNum) -> new TradeAreaChangeRow(
                rs.getString("trdar_chnge_ix"),
                rs.getString("trdar_chnge_ix_nm"),
                rs.getBigDecimal("opr_sale_mt_avrg"),
                rs.getBigDecimal("cls_sale_mt_avrg"),
                rs.getBigDecimal("su_opr_sale_mt_avrg"),
                rs.getBigDecimal("su_cls_sale_mt_avrg")
        );
    }

    private RowMapper<SalesAggregateRow> salesAggregateRowMapper() {
        return (rs, rowNum) -> new SalesAggregateRow(
                getLong(rs.getObject("total_sales_amount")),
                getLong(rs.getObject("total_sales_count")),
                getLong(rs.getObject("weekday_sales_amount")),
                getLong(rs.getObject("weekend_sales_amount"))
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

    public record DongRow(
            Long id,
            String dongCode,
            String dongName,
            String displayDongCode,
            String displayDongName,
            String sigunguCode,
            String sigunguName,
            BigDecimal centerLat,
            BigDecimal centerLng
    ) {
    }

    public record PeriodRow(
            Long id,
            String periodKey,
            String stdrYyquCd,
            Integer year,
            Integer quarter
    ) {
    }

    public record FloatingPopulationRow(
            Long total,
            Long male,
            Long female,
            Long age10,
            Long age20,
            Long age30,
            Long age40,
            Long age50,
            Long age60Above,
            Long time0006,
            Long time0611,
            Long time1114,
            Long time1417,
            Long time1721,
            Long time2124,
            Long mon,
            Long tue,
            Long wed,
            Long thu,
            Long fri,
            Long sat,
            Long sun
    ) {
    }

    public record ResidentPopulationRow(
            Long total,
            Long male,
            Long female,
            Long age10,
            Long age20,
            Long age30,
            Long age40,
            Long age50,
            Long age60Above,
            Long maleAge10,
            Long maleAge20,
            Long maleAge30,
            Long maleAge40,
            Long maleAge50,
            Long maleAge60Above,
            Long femaleAge10,
            Long femaleAge20,
            Long femaleAge30,
            Long femaleAge40,
            Long femaleAge50,
            Long femaleAge60Above,
            Long totalHouseholds,
            Long apartmentHouseholds,
            Long nonApartmentHouseholds
    ) {
    }

    public record IndustrySalesRow(
            String industryCode,
            String industryName,
            Long salesAmount,
            Long salesCount,
            Long weekdaySalesAmount,
            Long weekendSalesAmount,
            Long previousSalesAmount,
            Long storeCount
    ) {
    }

    public record SalesAggregateRow(
            Long totalSalesAmount,
            Long totalSalesCount,
            Long weekdaySalesAmount,
            Long weekendSalesAmount
    ) {
    }

    public record IndustryStoreRow(
            String industryCode,
            String industryName,
            Long totalStores,
            Long normalStores,
            Long franchiseStores,
            BigDecimal openRate,
            Long openedStores,
            BigDecimal closeRate,
            Long closedStores
    ) {
    }

    public record TradeAreaChangeRow(
            String changeIndex,
            String changeIndexName,
            BigDecimal operationMonthsAverage,
            BigDecimal closureMonthsAverage,
            BigDecimal seoulOperationMonthsAverage,
            BigDecimal seoulClosureMonthsAverage
    ) {
    }
}
