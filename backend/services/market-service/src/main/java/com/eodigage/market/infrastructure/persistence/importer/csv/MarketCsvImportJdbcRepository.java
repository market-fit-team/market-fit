package com.eodigage.market.infrastructure.persistence.importer.csv;

import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import com.eodigage.market.application.importer.csv.MarketCsvImportService;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MarketCsvImportJdbcRepository {

    private static final String DEFAULT_BASE_DATE = "00000000";

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public Long upsertDataSource(String sourceCode, String sourceName) {
        String sql = """
                INSERT INTO market_data_sources (
                    source_code, source_name, provider, source_url, api_name, description
                )
                VALUES (
                    :sourceCode, :sourceName, 'local-csv', :sourceUrl, :sourceName,
                    'Local CSV import from backend/data'
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
                    :sourceId, :requestedPath, 'STARTED', 'CSV import started'
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
                    result_message = 'CSV import completed',
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

    public Long upsertPeriod(String stdrYyquCd) {
        String sql = """
                INSERT INTO market_metric_periods (
                    period_key, stdr_yyqu_cd, year, quarter
                )
                VALUES (
                    :periodKey, :stdrYyquCd, :year, :quarter
                )
                ON CONFLICT (stdr_yyqu_cd) DO UPDATE SET
                    period_key = EXCLUDED.period_key,
                    year = EXCLUDED.year,
                    quarter = EXCLUDED.quarter
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("periodKey", stdrYyquCd)
                        .addValue("stdrYyquCd", stdrYyquCd)
                        .addValue("year", parseYear(stdrYyquCd))
                        .addValue("quarter", parseQuarter(stdrYyquCd)),
                Long.class
        );
    }

    public Long upsertDong(String admDrCd, String admDrNm) {
        String sql = """
                INSERT INTO market_admin_dongs (
                    base_date, adm_dr_cd, adm_dr_nm, sigungu_id
                )
                VALUES (
                    :baseDate,
                    :admDrCd,
                    COALESCE(:admDrNm, :admDrCd),
                    (
                        SELECT id
                        FROM market_admin_sigungu
                        WHERE sigungu_cd = substring(:admDrCd from 1 for 5)
                        LIMIT 1
                    )
                )
                ON CONFLICT (adm_dr_cd) DO UPDATE SET
                    adm_dr_nm = COALESCE(EXCLUDED.adm_dr_nm, market_admin_dongs.adm_dr_nm),
                    sigungu_id = COALESCE(EXCLUDED.sigungu_id, market_admin_dongs.sigungu_id),
                    updated_at = NOW()
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("baseDate", DEFAULT_BASE_DATE)
                        .addValue("admDrCd", admDrCd)
                        .addValue("admDrNm", admDrNm),
                Long.class
        );
    }

    public Long upsertIndustry(String industryCode, String industryName) {
        String sql = """
                INSERT INTO market_service_industries (
                    svc_induty_cd, svc_induty_cd_nm
                )
                VALUES (
                    :industryCode, COALESCE(:industryName, :industryCode)
                )
                ON CONFLICT (svc_induty_cd) DO UPDATE SET
                    svc_induty_cd_nm = COALESCE(EXCLUDED.svc_induty_cd_nm, market_service_industries.svc_induty_cd_nm),
                    updated_at = NOW()
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("industryCode", industryCode)
                        .addValue("industryName", industryName),
                Long.class
        );
    }

    public void upsertFloatingPopulation(
            Long periodId,
            Long dongId,
            Long sourceId,
            Long batchId,
            Map<String, String> row
    ) {
        MapSqlParameterSource params = commonFactParams(periodId, dongId, sourceId, batchId);
        longParam(params, row, "totFlpopCo", "TOT_FLPOP_CO");
        longParam(params, row, "mlFlpopCo", "ML_FLPOP_CO");
        longParam(params, row, "fmlFlpopCo", "FML_FLPOP_CO");
        longParam(params, row, "agrde10FlpopCo", "AGRDE_10_FLPOP_CO");
        longParam(params, row, "agrde20FlpopCo", "AGRDE_20_FLPOP_CO");
        longParam(params, row, "agrde30FlpopCo", "AGRDE_30_FLPOP_CO");
        longParam(params, row, "agrde40FlpopCo", "AGRDE_40_FLPOP_CO");
        longParam(params, row, "agrde50FlpopCo", "AGRDE_50_FLPOP_CO");
        longParam(params, row, "agrde60AboveFlpopCo", "AGRDE_60_ABOVE_FLPOP_CO");
        longParam(params, row, "tmzon0006FlpopCo", "TMZON_00_06_FLPOP_CO");
        longParam(params, row, "tmzon0611FlpopCo", "TMZON_06_11_FLPOP_CO");
        longParam(params, row, "tmzon1114FlpopCo", "TMZON_11_14_FLPOP_CO");
        longParam(params, row, "tmzon1417FlpopCo", "TMZON_14_17_FLPOP_CO");
        longParam(params, row, "tmzon1721FlpopCo", "TMZON_17_21_FLPOP_CO");
        longParam(params, row, "tmzon2124FlpopCo", "TMZON_21_24_FLPOP_CO");
        longParam(params, row, "monFlpopCo", "MON_FLPOP_CO");
        longParam(params, row, "tuesFlpopCo", "TUES_FLPOP_CO");
        longParam(params, row, "wedFlpopCo", "WED_FLPOP_CO");
        longParam(params, row, "thurFlpopCo", "THUR_FLPOP_CO");
        longParam(params, row, "friFlpopCo", "FRI_FLPOP_CO");
        longParam(params, row, "satFlpopCo", "SAT_FLPOP_CO");
        longParam(params, row, "sunFlpopCo", "SUN_FLPOP_CO");

        String sql = """
                INSERT INTO market_floating_populations (
                    period_id, dong_id, source_id, ingest_batch_id,
                    tot_flpop_co, ml_flpop_co, fml_flpop_co,
                    agrde_10_flpop_co, agrde_20_flpop_co, agrde_30_flpop_co,
                    agrde_40_flpop_co, agrde_50_flpop_co, agrde_60_above_flpop_co,
                    tmzon_00_06_flpop_co, tmzon_06_11_flpop_co, tmzon_11_14_flpop_co,
                    tmzon_14_17_flpop_co, tmzon_17_21_flpop_co, tmzon_21_24_flpop_co,
                    mon_flpop_co, tues_flpop_co, wed_flpop_co, thur_flpop_co,
                    fri_flpop_co, sat_flpop_co, sun_flpop_co
                )
                VALUES (
                    :periodId, :dongId, :sourceId, :batchId,
                    :totFlpopCo, :mlFlpopCo, :fmlFlpopCo,
                    :agrde10FlpopCo, :agrde20FlpopCo, :agrde30FlpopCo,
                    :agrde40FlpopCo, :agrde50FlpopCo, :agrde60AboveFlpopCo,
                    :tmzon0006FlpopCo, :tmzon0611FlpopCo, :tmzon1114FlpopCo,
                    :tmzon1417FlpopCo, :tmzon1721FlpopCo, :tmzon2124FlpopCo,
                    :monFlpopCo, :tuesFlpopCo, :wedFlpopCo, :thurFlpopCo,
                    :friFlpopCo, :satFlpopCo, :sunFlpopCo
                )
                ON CONFLICT (period_id, dong_id) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    tot_flpop_co = EXCLUDED.tot_flpop_co,
                    ml_flpop_co = EXCLUDED.ml_flpop_co,
                    fml_flpop_co = EXCLUDED.fml_flpop_co,
                    agrde_10_flpop_co = EXCLUDED.agrde_10_flpop_co,
                    agrde_20_flpop_co = EXCLUDED.agrde_20_flpop_co,
                    agrde_30_flpop_co = EXCLUDED.agrde_30_flpop_co,
                    agrde_40_flpop_co = EXCLUDED.agrde_40_flpop_co,
                    agrde_50_flpop_co = EXCLUDED.agrde_50_flpop_co,
                    agrde_60_above_flpop_co = EXCLUDED.agrde_60_above_flpop_co,
                    tmzon_00_06_flpop_co = EXCLUDED.tmzon_00_06_flpop_co,
                    tmzon_06_11_flpop_co = EXCLUDED.tmzon_06_11_flpop_co,
                    tmzon_11_14_flpop_co = EXCLUDED.tmzon_11_14_flpop_co,
                    tmzon_14_17_flpop_co = EXCLUDED.tmzon_14_17_flpop_co,
                    tmzon_17_21_flpop_co = EXCLUDED.tmzon_17_21_flpop_co,
                    tmzon_21_24_flpop_co = EXCLUDED.tmzon_21_24_flpop_co,
                    mon_flpop_co = EXCLUDED.mon_flpop_co,
                    tues_flpop_co = EXCLUDED.tues_flpop_co,
                    wed_flpop_co = EXCLUDED.wed_flpop_co,
                    thur_flpop_co = EXCLUDED.thur_flpop_co,
                    fri_flpop_co = EXCLUDED.fri_flpop_co,
                    sat_flpop_co = EXCLUDED.sat_flpop_co,
                    sun_flpop_co = EXCLUDED.sun_flpop_co,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(sql, params);
    }

    public void upsertResidentPopulation(
            Long periodId,
            Long dongId,
            Long sourceId,
            Long batchId,
            Map<String, String> row
    ) {
        MapSqlParameterSource params = commonFactParams(periodId, dongId, sourceId, batchId);
        for (String sourceColumn : RESIDENT_LONG_COLUMNS.keySet()) {
            longParam(params, row, RESIDENT_LONG_COLUMNS.get(sourceColumn), sourceColumn);
        }

        String sql = """
                INSERT INTO market_resident_populations (
                    period_id, dong_id, source_id, ingest_batch_id,
                    tot_repop_co, ml_repop_co, fml_repop_co,
                    agrde_10_repop_co, agrde_20_repop_co, agrde_30_repop_co,
                    agrde_40_repop_co, agrde_50_repop_co, agrde_60_above_repop_co,
                    mag_10_repop_co, mag_20_repop_co, mag_30_repop_co,
                    mag_40_repop_co, mag_50_repop_co, mag_60_above_repop_co,
                    fag_10_repop_co, fag_20_repop_co, fag_30_repop_co,
                    fag_40_repop_co, fag_50_repop_co, fag_60_above_repop_co,
                    tot_hshld_co, apt_hshld_co, non_apt_hshld_co
                )
                VALUES (
                    :periodId, :dongId, :sourceId, :batchId,
                    :totRepopCo, :mlRepopCo, :fmlRepopCo,
                    :agrde10RepopCo, :agrde20RepopCo, :agrde30RepopCo,
                    :agrde40RepopCo, :agrde50RepopCo, :agrde60AboveRepopCo,
                    :mag10RepopCo, :mag20RepopCo, :mag30RepopCo,
                    :mag40RepopCo, :mag50RepopCo, :mag60AboveRepopCo,
                    :fag10RepopCo, :fag20RepopCo, :fag30RepopCo,
                    :fag40RepopCo, :fag50RepopCo, :fag60AboveRepopCo,
                    :totHshldCo, :aptHshldCo, :nonAptHshldCo
                )
                ON CONFLICT (period_id, dong_id) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    tot_repop_co = EXCLUDED.tot_repop_co,
                    ml_repop_co = EXCLUDED.ml_repop_co,
                    fml_repop_co = EXCLUDED.fml_repop_co,
                    agrde_10_repop_co = EXCLUDED.agrde_10_repop_co,
                    agrde_20_repop_co = EXCLUDED.agrde_20_repop_co,
                    agrde_30_repop_co = EXCLUDED.agrde_30_repop_co,
                    agrde_40_repop_co = EXCLUDED.agrde_40_repop_co,
                    agrde_50_repop_co = EXCLUDED.agrde_50_repop_co,
                    agrde_60_above_repop_co = EXCLUDED.agrde_60_above_repop_co,
                    mag_10_repop_co = EXCLUDED.mag_10_repop_co,
                    mag_20_repop_co = EXCLUDED.mag_20_repop_co,
                    mag_30_repop_co = EXCLUDED.mag_30_repop_co,
                    mag_40_repop_co = EXCLUDED.mag_40_repop_co,
                    mag_50_repop_co = EXCLUDED.mag_50_repop_co,
                    mag_60_above_repop_co = EXCLUDED.mag_60_above_repop_co,
                    fag_10_repop_co = EXCLUDED.fag_10_repop_co,
                    fag_20_repop_co = EXCLUDED.fag_20_repop_co,
                    fag_30_repop_co = EXCLUDED.fag_30_repop_co,
                    fag_40_repop_co = EXCLUDED.fag_40_repop_co,
                    fag_50_repop_co = EXCLUDED.fag_50_repop_co,
                    fag_60_above_repop_co = EXCLUDED.fag_60_above_repop_co,
                    tot_hshld_co = EXCLUDED.tot_hshld_co,
                    apt_hshld_co = EXCLUDED.apt_hshld_co,
                    non_apt_hshld_co = EXCLUDED.non_apt_hshld_co,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(sql, params);
    }

    public void upsertIndustrySales(
            Long periodId,
            Long dongId,
            Long industryId,
            Long sourceId,
            Long batchId,
            Map<String, String> row
    ) {
        MapSqlParameterSource params = industryFactParams(periodId, dongId, industryId, sourceId, batchId);
        for (String sourceColumn : SALES_LONG_COLUMNS.keySet()) {
            longParam(params, row, SALES_LONG_COLUMNS.get(sourceColumn), sourceColumn);
        }

        String sql = """
                INSERT INTO market_industry_sales (
                    period_id, dong_id, industry_id, source_id, ingest_batch_id,
                    thsmon_selng_amt, thsmon_selng_co, mdwk_selng_amt, wkend_selng_amt,
                    mon_selng_amt, tues_selng_amt, wed_selng_amt, thur_selng_amt,
                    fri_selng_amt, sat_selng_amt, sun_selng_amt,
                    tmzon_00_06_selng_amt, tmzon_06_11_selng_amt, tmzon_11_14_selng_amt,
                    tmzon_14_17_selng_amt, tmzon_17_21_selng_amt, tmzon_21_24_selng_amt,
                    ml_selng_amt, fml_selng_amt,
                    agrde_10_selng_amt, agrde_20_selng_amt, agrde_30_selng_amt,
                    agrde_40_selng_amt, agrde_50_selng_amt, agrde_60_above_selng_amt,
                    mdwk_selng_co, wkend_selng_co, mon_selng_co, tues_selng_co,
                    wed_selng_co, thur_selng_co, fri_selng_co, sat_selng_co, sun_selng_co,
                    tmzon_00_06_selng_co, tmzon_06_11_selng_co, tmzon_11_14_selng_co,
                    tmzon_14_17_selng_co, tmzon_17_21_selng_co, tmzon_21_24_selng_co,
                    ml_selng_co, fml_selng_co,
                    agrde_10_selng_co, agrde_20_selng_co, agrde_30_selng_co,
                    agrde_40_selng_co, agrde_50_selng_co, agrde_60_above_selng_co
                )
                VALUES (
                    :periodId, :dongId, :industryId, :sourceId, :batchId,
                    :thsmonSelngAmt, :thsmonSelngCo, :mdwkSelngAmt, :wkendSelngAmt,
                    :monSelngAmt, :tuesSelngAmt, :wedSelngAmt, :thurSelngAmt,
                    :friSelngAmt, :satSelngAmt, :sunSelngAmt,
                    :tmzon0006SelngAmt, :tmzon0611SelngAmt, :tmzon1114SelngAmt,
                    :tmzon1417SelngAmt, :tmzon1721SelngAmt, :tmzon2124SelngAmt,
                    :mlSelngAmt, :fmlSelngAmt,
                    :agrde10SelngAmt, :agrde20SelngAmt, :agrde30SelngAmt,
                    :agrde40SelngAmt, :agrde50SelngAmt, :agrde60AboveSelngAmt,
                    :mdwkSelngCo, :wkendSelngCo, :monSelngCo, :tuesSelngCo,
                    :wedSelngCo, :thurSelngCo, :friSelngCo, :satSelngCo, :sunSelngCo,
                    :tmzon0006SelngCo, :tmzon0611SelngCo, :tmzon1114SelngCo,
                    :tmzon1417SelngCo, :tmzon1721SelngCo, :tmzon2124SelngCo,
                    :mlSelngCo, :fmlSelngCo,
                    :agrde10SelngCo, :agrde20SelngCo, :agrde30SelngCo,
                    :agrde40SelngCo, :agrde50SelngCo, :agrde60AboveSelngCo
                )
                ON CONFLICT (period_id, dong_id, industry_id) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    thsmon_selng_amt = EXCLUDED.thsmon_selng_amt,
                    thsmon_selng_co = EXCLUDED.thsmon_selng_co,
                    mdwk_selng_amt = EXCLUDED.mdwk_selng_amt,
                    wkend_selng_amt = EXCLUDED.wkend_selng_amt,
                    mon_selng_amt = EXCLUDED.mon_selng_amt,
                    tues_selng_amt = EXCLUDED.tues_selng_amt,
                    wed_selng_amt = EXCLUDED.wed_selng_amt,
                    thur_selng_amt = EXCLUDED.thur_selng_amt,
                    fri_selng_amt = EXCLUDED.fri_selng_amt,
                    sat_selng_amt = EXCLUDED.sat_selng_amt,
                    sun_selng_amt = EXCLUDED.sun_selng_amt,
                    tmzon_00_06_selng_amt = EXCLUDED.tmzon_00_06_selng_amt,
                    tmzon_06_11_selng_amt = EXCLUDED.tmzon_06_11_selng_amt,
                    tmzon_11_14_selng_amt = EXCLUDED.tmzon_11_14_selng_amt,
                    tmzon_14_17_selng_amt = EXCLUDED.tmzon_14_17_selng_amt,
                    tmzon_17_21_selng_amt = EXCLUDED.tmzon_17_21_selng_amt,
                    tmzon_21_24_selng_amt = EXCLUDED.tmzon_21_24_selng_amt,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(sql, params);
    }

    public void upsertIndustryStores(
            Long periodId,
            Long dongId,
            Long industryId,
            Long sourceId,
            Long batchId,
            Map<String, String> row
    ) {
        MapSqlParameterSource params = industryFactParams(periodId, dongId, industryId, sourceId, batchId);
        longParam(params, row, "similrIndutyStorCo", "SIMILR_INDUTY_STOR_CO");
        longParam(params, row, "storCo", "STOR_CO");
        longParam(params, row, "frcStorCo", "FRC_STOR_CO");
        decimalParam(params, row, "opbizRt", "OPBIZ_RT");
        longParam(params, row, "opbizStorCo", "OPBIZ_STOR_CO");
        decimalParam(params, row, "clsbizRt", "CLSBIZ_RT");
        longParam(params, row, "clsbizStorCo", "CLSBIZ_STOR_CO");

        String sql = """
                INSERT INTO market_industry_stores (
                    period_id, dong_id, industry_id, source_id, ingest_batch_id,
                    similr_induty_stor_co, stor_co, frc_stor_co,
                    opbiz_rt, opbiz_stor_co, clsbiz_rt, clsbiz_stor_co
                )
                VALUES (
                    :periodId, :dongId, :industryId, :sourceId, :batchId,
                    :similrIndutyStorCo, :storCo, :frcStorCo,
                    :opbizRt, :opbizStorCo, :clsbizRt, :clsbizStorCo
                )
                ON CONFLICT (period_id, dong_id, industry_id) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    similr_induty_stor_co = EXCLUDED.similr_induty_stor_co,
                    stor_co = EXCLUDED.stor_co,
                    frc_stor_co = EXCLUDED.frc_stor_co,
                    opbiz_rt = EXCLUDED.opbiz_rt,
                    opbiz_stor_co = EXCLUDED.opbiz_stor_co,
                    clsbiz_rt = EXCLUDED.clsbiz_rt,
                    clsbiz_stor_co = EXCLUDED.clsbiz_stor_co,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(sql, params);
    }

    public void upsertTradeAreaChange(
            Long periodId,
            Long dongId,
            Long sourceId,
            Long batchId,
            Map<String, String> row
    ) {
        MapSqlParameterSource params = commonFactParams(periodId, dongId, sourceId, batchId);
        stringParam(params, row, "trdarChngeIx", "TRDAR_CHNGE_IX");
        stringParam(params, row, "trdarChngeIxNm", "TRDAR_CHNGE_IX_NM");
        decimalParam(params, row, "oprSaleMtAvrg", "OPR_SALE_MT_AVRG");
        decimalParam(params, row, "clsSaleMtAvrg", "CLS_SALE_MT_AVRG");
        decimalParam(params, row, "suOprSaleMtAvrg", "SU_OPR_SALE_MT_AVRG");
        decimalParam(params, row, "suClsSaleMtAvrg", "SU_CLS_SALE_MT_AVRG");

        String sql = """
                INSERT INTO market_trade_area_changes (
                    period_id, dong_id, source_id, ingest_batch_id,
                    trdar_chnge_ix, trdar_chnge_ix_nm,
                    opr_sale_mt_avrg, cls_sale_mt_avrg,
                    su_opr_sale_mt_avrg, su_cls_sale_mt_avrg
                )
                VALUES (
                    :periodId, :dongId, :sourceId, :batchId,
                    :trdarChngeIx, :trdarChngeIxNm,
                    :oprSaleMtAvrg, :clsSaleMtAvrg,
                    :suOprSaleMtAvrg, :suClsSaleMtAvrg
                )
                ON CONFLICT (period_id, dong_id) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    trdar_chnge_ix = EXCLUDED.trdar_chnge_ix,
                    trdar_chnge_ix_nm = EXCLUDED.trdar_chnge_ix_nm,
                    opr_sale_mt_avrg = EXCLUDED.opr_sale_mt_avrg,
                    cls_sale_mt_avrg = EXCLUDED.cls_sale_mt_avrg,
                    su_opr_sale_mt_avrg = EXCLUDED.su_opr_sale_mt_avrg,
                    su_cls_sale_mt_avrg = EXCLUDED.su_cls_sale_mt_avrg,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(sql, params);
    }

    private MapSqlParameterSource commonFactParams(
            Long periodId,
            Long dongId,
            Long sourceId,
            Long batchId
    ) {
        return new MapSqlParameterSource()
                .addValue("periodId", periodId)
                .addValue("dongId", dongId)
                .addValue("sourceId", sourceId)
                .addValue("batchId", batchId);
    }

    private MapSqlParameterSource industryFactParams(
            Long periodId,
            Long dongId,
            Long industryId,
            Long sourceId,
            Long batchId
    ) {
        return commonFactParams(periodId, dongId, sourceId, batchId)
                .addValue("industryId", industryId);
    }

    private void stringParam(
            MapSqlParameterSource params,
            Map<String, String> row,
            String paramName,
            String sourceColumn
    ) {
        String value = row.get(sourceColumn);
        params.addValue(paramName, value == null || value.isBlank() ? null : value.trim());
    }

    private void longParam(
            MapSqlParameterSource params,
            Map<String, String> row,
            String paramName,
            String sourceColumn
    ) {
        params.addValue(paramName, MarketCsvImportService.longValue(row, sourceColumn));
    }

    private void decimalParam(
            MapSqlParameterSource params,
            Map<String, String> row,
            String paramName,
            String sourceColumn
    ) {
        params.addValue(paramName, MarketCsvImportService.decimalValue(row, sourceColumn));
    }

    private Integer parseYear(String stdrYyquCd) {
        if (stdrYyquCd == null || stdrYyquCd.length() < 4) {
            return null;
        }
        return Integer.parseInt(stdrYyquCd.substring(0, 4));
    }

    private Integer parseQuarter(String stdrYyquCd) {
        if (stdrYyquCd == null || stdrYyquCd.length() < 5) {
            return null;
        }
        return Integer.parseInt(stdrYyquCd.substring(4, 5));
    }

    private static final Map<String, String> RESIDENT_LONG_COLUMNS = Map.ofEntries(
            Map.entry("TOT_REPOP_CO", "totRepopCo"),
            Map.entry("ML_REPOP_CO", "mlRepopCo"),
            Map.entry("FML_REPOP_CO", "fmlRepopCo"),
            Map.entry("AGRDE_10_REPOP_CO", "agrde10RepopCo"),
            Map.entry("AGRDE_20_REPOP_CO", "agrde20RepopCo"),
            Map.entry("AGRDE_30_REPOP_CO", "agrde30RepopCo"),
            Map.entry("AGRDE_40_REPOP_CO", "agrde40RepopCo"),
            Map.entry("AGRDE_50_REPOP_CO", "agrde50RepopCo"),
            Map.entry("AGRDE_60_ABOVE_REPOP_CO", "agrde60AboveRepopCo"),
            Map.entry("MAG_10_REPOP_CO", "mag10RepopCo"),
            Map.entry("MAG_20_REPOP_CO", "mag20RepopCo"),
            Map.entry("MAG_30_REPOP_CO", "mag30RepopCo"),
            Map.entry("MAG_40_REPOP_CO", "mag40RepopCo"),
            Map.entry("MAG_50_REPOP_CO", "mag50RepopCo"),
            Map.entry("MAG_60_ABOVE_REPOP_CO", "mag60AboveRepopCo"),
            Map.entry("FAG_10_REPOP_CO", "fag10RepopCo"),
            Map.entry("FAG_20_REPOP_CO", "fag20RepopCo"),
            Map.entry("FAG_30_REPOP_CO", "fag30RepopCo"),
            Map.entry("FAG_40_REPOP_CO", "fag40RepopCo"),
            Map.entry("FAG_50_REPOP_CO", "fag50RepopCo"),
            Map.entry("FAG_60_ABOVE_REPOP_CO", "fag60AboveRepopCo"),
            Map.entry("TOT_HSHLD_CO", "totHshldCo"),
            Map.entry("APT_HSHLD_CO", "aptHshldCo"),
            Map.entry("NON_APT_HSHLD_CO", "nonAptHshldCo")
    );

    private static final Map<String, String> SALES_LONG_COLUMNS = Map.ofEntries(
            Map.entry("THSMON_SELNG_AMT", "thsmonSelngAmt"),
            Map.entry("THSMON_SELNG_CO", "thsmonSelngCo"),
            Map.entry("MDWK_SELNG_AMT", "mdwkSelngAmt"),
            Map.entry("WKEND_SELNG_AMT", "wkendSelngAmt"),
            Map.entry("MON_SELNG_AMT", "monSelngAmt"),
            Map.entry("TUES_SELNG_AMT", "tuesSelngAmt"),
            Map.entry("WED_SELNG_AMT", "wedSelngAmt"),
            Map.entry("THUR_SELNG_AMT", "thurSelngAmt"),
            Map.entry("FRI_SELNG_AMT", "friSelngAmt"),
            Map.entry("SAT_SELNG_AMT", "satSelngAmt"),
            Map.entry("SUN_SELNG_AMT", "sunSelngAmt"),
            Map.entry("TMZON_00_06_SELNG_AMT", "tmzon0006SelngAmt"),
            Map.entry("TMZON_06_11_SELNG_AMT", "tmzon0611SelngAmt"),
            Map.entry("TMZON_11_14_SELNG_AMT", "tmzon1114SelngAmt"),
            Map.entry("TMZON_14_17_SELNG_AMT", "tmzon1417SelngAmt"),
            Map.entry("TMZON_17_21_SELNG_AMT", "tmzon1721SelngAmt"),
            Map.entry("TMZON_21_24_SELNG_AMT", "tmzon2124SelngAmt"),
            Map.entry("ML_SELNG_AMT", "mlSelngAmt"),
            Map.entry("FML_SELNG_AMT", "fmlSelngAmt"),
            Map.entry("AGRDE_10_SELNG_AMT", "agrde10SelngAmt"),
            Map.entry("AGRDE_20_SELNG_AMT", "agrde20SelngAmt"),
            Map.entry("AGRDE_30_SELNG_AMT", "agrde30SelngAmt"),
            Map.entry("AGRDE_40_SELNG_AMT", "agrde40SelngAmt"),
            Map.entry("AGRDE_50_SELNG_AMT", "agrde50SelngAmt"),
            Map.entry("AGRDE_60_ABOVE_SELNG_AMT", "agrde60AboveSelngAmt"),
            Map.entry("MDWK_SELNG_CO", "mdwkSelngCo"),
            Map.entry("WKEND_SELNG_CO", "wkendSelngCo"),
            Map.entry("MON_SELNG_CO", "monSelngCo"),
            Map.entry("TUES_SELNG_CO", "tuesSelngCo"),
            Map.entry("WED_SELNG_CO", "wedSelngCo"),
            Map.entry("THUR_SELNG_CO", "thurSelngCo"),
            Map.entry("FRI_SELNG_CO", "friSelngCo"),
            Map.entry("SAT_SELNG_CO", "satSelngCo"),
            Map.entry("SUN_SELNG_CO", "sunSelngCo"),
            Map.entry("TMZON_00_06_SELNG_CO", "tmzon0006SelngCo"),
            Map.entry("TMZON_06_11_SELNG_CO", "tmzon0611SelngCo"),
            Map.entry("TMZON_11_14_SELNG_CO", "tmzon1114SelngCo"),
            Map.entry("TMZON_14_17_SELNG_CO", "tmzon1417SelngCo"),
            Map.entry("TMZON_17_21_SELNG_CO", "tmzon1721SelngCo"),
            Map.entry("TMZON_21_24_SELNG_CO", "tmzon2124SelngCo"),
            Map.entry("ML_SELNG_CO", "mlSelngCo"),
            Map.entry("FML_SELNG_CO", "fmlSelngCo"),
            Map.entry("AGRDE_10_SELNG_CO", "agrde10SelngCo"),
            Map.entry("AGRDE_20_SELNG_CO", "agrde20SelngCo"),
            Map.entry("AGRDE_30_SELNG_CO", "agrde30SelngCo"),
            Map.entry("AGRDE_40_SELNG_CO", "agrde40SelngCo"),
            Map.entry("AGRDE_50_SELNG_CO", "agrde50SelngCo"),
            Map.entry("AGRDE_60_ABOVE_SELNG_CO", "agrde60AboveSelngCo")
    );
}
