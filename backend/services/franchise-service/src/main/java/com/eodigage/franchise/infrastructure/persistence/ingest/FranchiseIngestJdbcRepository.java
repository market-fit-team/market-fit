package com.eodigage.franchise.infrastructure.persistence.ingest;

import static java.util.Map.entry;

import java.util.Map;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class FranchiseIngestJdbcRepository {

    private static final Map<String, MarketIndustryMapping> MARKET_INDUSTRY_MAPPINGS = Map.ofEntries(
            entry("한식", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("일식", new MarketIndustryMapping("CS100003", "일식음식점")),
            entry("중식", new MarketIndustryMapping("CS100002", "중식음식점")),
            entry("서양식", new MarketIndustryMapping("CS100004", "양식음식점")),
            entry("기타 외국식", new MarketIndustryMapping("CS100004", "양식음식점")),
            entry("피자", new MarketIndustryMapping("CS100004", "양식음식점")),
            entry("치킨", new MarketIndustryMapping("CS100007", "치킨전문점")),
            entry("분식", new MarketIndustryMapping("CS100008", "분식전문점")),
            entry("제과제빵", new MarketIndustryMapping("CS100005", "제과점")),
            entry("패스트푸드", new MarketIndustryMapping("CS100006", "패스트푸드점")),
            entry("주점", new MarketIndustryMapping("CS100009", "호프-간이주점")),
            entry("커피", new MarketIndustryMapping("CS100010", "커피-음료")),
            entry("음료 (커피 외)", new MarketIndustryMapping("CS100010", "커피-음료")),
            entry("아이스크림/빙수", new MarketIndustryMapping("CS100010", "커피-음료")),
            entry("이미용", new MarketIndustryMapping("CS200028", "미용실")),
            entry("교육 (외국어)", new MarketIndustryMapping("CS200002", "외국어학원")),
            entry("교육 (교과)", new MarketIndustryMapping("CS200001", "일반교습학원")),
            entry("스포츠 관련", new MarketIndustryMapping("CS200024", "스포츠클럽")),
            entry("자동차 관련", new MarketIndustryMapping("CS200025", "자동차수리")),
            entry("PC방", new MarketIndustryMapping("CS200019", "PC방")),
            entry("오락", new MarketIndustryMapping("CS200021", "기타오락장")),
            entry("세탁", new MarketIndustryMapping("CS200031", "세탁소")),
            entry("부동산 중개", new MarketIndustryMapping("CS200033", "부동산중개업")),
            entry("숙박", new MarketIndustryMapping("CS200034", "여관")),
            entry("안경", new MarketIndustryMapping("CS300016", "안경")),
            entry("약국", new MarketIndustryMapping("CS300018", "의약품")),
            entry("반려동물 관련", new MarketIndustryMapping("CS300029", "애완동물")),
            entry("편의점", new MarketIndustryMapping("CS300002", "편의점")),
            entry("의류 / 패션", new MarketIndustryMapping("CS300011", "일반의류")),
            entry("화장품", new MarketIndustryMapping("CS300022", "화장품")),
            entry("종합소매점", new MarketIndustryMapping("CS300001", "슈퍼마켓"))
    );

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public Long upsertDataSource(String sourceCode, String sourceName, String sourceUrl, String apiName) {
        String sql = """
                INSERT INTO franchise_data_sources (
                    source_code, source_name, provider, source_url, api_name, description
                )
                VALUES (
                    :sourceCode, :sourceName, '공정거래위원회', :sourceUrl, :apiName,
                    '공공데이터포털 가맹사업 공개정보 API'
                )
                ON CONFLICT (source_code) DO UPDATE SET
                    source_name = EXCLUDED.source_name,
                    source_url = EXCLUDED.source_url,
                    api_name = EXCLUDED.api_name,
                    updated_at = NOW()
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("sourceCode", sourceCode)
                        .addValue("sourceName", sourceName)
                        .addValue("sourceUrl", sourceUrl)
                        .addValue("apiName", apiName),
                Long.class
        );
    }

    public Long createIngestBatch(Long sourceId, String requestedPath, String requestParamsJson) {
        String sql = """
                INSERT INTO franchise_ingest_batches (
                    source_id, requested_path, request_params_json, result_code, result_message
                )
                VALUES (
                    :sourceId, :requestedPath, CAST(:requestParamsJson AS jsonb), 'STARTED', '적재 시작'
                )
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("sourceId", sourceId)
                        .addValue("requestedPath", requestedPath)
                        .addValue("requestParamsJson", requestParamsJson),
                Long.class
        );
    }

    public void finishIngestBatch(
            Long batchId,
            String resultCode,
            String resultMessage,
            Integer totalCount,
            Integer fetchedCount
    ) {
        String sql = """
                UPDATE franchise_ingest_batches
                SET result_code = :resultCode,
                    result_message = :resultMessage,
                    total_count = :totalCount,
                    fetched_count = :fetchedCount
                WHERE id = :batchId
                """;

        jdbcTemplate.update(
                sql,
                new MapSqlParameterSource()
                        .addValue("batchId", batchId)
                        .addValue("resultCode", resultCode)
                        .addValue("resultMessage", resultMessage)
                        .addValue("totalCount", totalCount)
                        .addValue("fetchedCount", fetchedCount)
        );
    }

    public void failIngestBatch(Long batchId, String resultCode, String resultMessage) {
        String sql = """
                UPDATE franchise_ingest_batches
                SET result_code = :resultCode,
                    result_message = :resultMessage
                WHERE id = :batchId
                """;

        jdbcTemplate.update(
                sql,
                new MapSqlParameterSource()
                        .addValue("batchId", batchId)
                        .addValue("resultCode", resultCode)
                        .addValue("resultMessage", truncate(resultMessage, 2000))
        );
    }

    public Long upsertIndustry(String indutyLclasNm, String indutyMlsfcNm) {
        MarketIndustryMapping mapping = marketIndustryMapping(indutyMlsfcNm);
        String sql = """
                INSERT INTO franchise_industries (
                    induty_lclas_nm, induty_mlsfc_nm, market_svc_induty_cd, market_svc_induty_cd_nm
                )
                VALUES (
                    :indutyLclasNm, :indutyMlsfcNm, :marketSvcIndutyCd, :marketSvcIndutyCdNm
                )
                ON CONFLICT (induty_lclas_nm, induty_mlsfc_nm) DO UPDATE SET
                    market_svc_induty_cd = EXCLUDED.market_svc_induty_cd,
                    market_svc_induty_cd_nm = EXCLUDED.market_svc_induty_cd_nm,
                    updated_at = NOW()
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("indutyLclasNm", indutyLclasNm)
                        .addValue("indutyMlsfcNm", indutyMlsfcNm)
                        .addValue("marketSvcIndutyCd", mapping == null ? null : mapping.code())
                        .addValue("marketSvcIndutyCdNm", mapping == null ? null : mapping.name()),
                Long.class
        );
    }

    public Long upsertBrand(String brandCode, String brandName, String companyName, Long industryId) {
        String sql = """
                INSERT INTO franchise_brands (
                    brand_code, brand_name, company_name, primary_industry_id
                )
                VALUES (
                    :brandCode, :brandName, :companyName, :industryId
                )
                ON CONFLICT (brand_code) DO UPDATE SET
                    brand_name = EXCLUDED.brand_name,
                    company_name = EXCLUDED.company_name,
                    primary_industry_id = COALESCE(
                        franchise_brands.primary_industry_id,
                        EXCLUDED.primary_industry_id
                    ),
                    updated_at = NOW()
                RETURNING id
                """;

        return jdbcTemplate.queryForObject(
                sql,
                new MapSqlParameterSource()
                        .addValue("brandCode", brandCode)
                        .addValue("brandName", brandName)
                        .addValue("companyName", companyName)
                        .addValue("industryId", industryId),
                Long.class
        );
    }

    public void upsertStartupCost(
            Long brandId,
            Long sourceId,
            Long batchId,
            int baseYear,
            Map<String, String> item
    ) {
        String sql = """
                INSERT INTO franchise_startup_costs (
                    brand_id, source_id, ingest_batch_id, base_year,
                    jng_bzmn_jng_amt, jng_bzmn_edu_amt, jng_bzmn_etc_amt,
                    jng_bzmn_assrnc_amt, smtn_amt
                )
                VALUES (
                    :brandId, :sourceId, :batchId, :baseYear,
                    :jngAmt, :eduAmt, :etcAmt, :assrncAmt, :smtnAmt
                )
                ON CONFLICT (brand_id, base_year) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    jng_bzmn_jng_amt = EXCLUDED.jng_bzmn_jng_amt,
                    jng_bzmn_edu_amt = EXCLUDED.jng_bzmn_edu_amt,
                    jng_bzmn_etc_amt = EXCLUDED.jng_bzmn_etc_amt,
                    jng_bzmn_assrnc_amt = EXCLUDED.jng_bzmn_assrnc_amt,
                    smtn_amt = EXCLUDED.smtn_amt,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(
                sql,
                new MapSqlParameterSource()
                        .addValue("brandId", brandId)
                        .addValue("sourceId", sourceId)
                        .addValue("batchId", batchId)
                        .addValue("baseYear", baseYear)
                        .addValue("jngAmt", longValue(item, "jngBzmnJngAmt"))
                        .addValue("eduAmt", longValue(item, "jngBzmnEduAmt"))
                        .addValue("etcAmt", longValue(item, "jngBzmnEtcAmt"))
                        .addValue("assrncAmt", longValue(item, "jngBzmnAssrncAmt"))
                        .addValue("smtnAmt", longValue(item, "smtnAmt"))
        );
    }

    public void upsertSalesStats(
            Long brandId,
            Long sourceId,
            Long batchId,
            int baseYear,
            Map<String, String> item
    ) {
        String sql = """
                INSERT INTO franchise_sales_stats (
                    brand_id, source_id, ingest_batch_id, base_year,
                    frcs_cnt, new_frcs_rgs_cnt, ctrt_end_cnt, ctrt_cncltn_cnt,
                    nm_chg_cnt, avrg_sls_amt, ar_unit_avrg_sls_amt
                )
                VALUES (
                    :brandId, :sourceId, :batchId, :baseYear,
                    :frcsCnt, :newFrcsRgsCnt, :ctrtEndCnt, :ctrtCncltnCnt,
                    :nmChgCnt, :avrgSlsAmt, :arUnitAvrgSlsAmt
                )
                ON CONFLICT (brand_id, base_year) DO UPDATE SET
                    source_id = EXCLUDED.source_id,
                    ingest_batch_id = EXCLUDED.ingest_batch_id,
                    frcs_cnt = EXCLUDED.frcs_cnt,
                    new_frcs_rgs_cnt = EXCLUDED.new_frcs_rgs_cnt,
                    ctrt_end_cnt = EXCLUDED.ctrt_end_cnt,
                    ctrt_cncltn_cnt = EXCLUDED.ctrt_cncltn_cnt,
                    nm_chg_cnt = EXCLUDED.nm_chg_cnt,
                    avrg_sls_amt = EXCLUDED.avrg_sls_amt,
                    ar_unit_avrg_sls_amt = EXCLUDED.ar_unit_avrg_sls_amt,
                    updated_at = NOW()
                """;

        jdbcTemplate.update(
                sql,
                new MapSqlParameterSource()
                        .addValue("brandId", brandId)
                        .addValue("sourceId", sourceId)
                        .addValue("batchId", batchId)
                        .addValue("baseYear", baseYear)
                        .addValue("frcsCnt", intValue(item, "frcsCnt"))
                        .addValue("newFrcsRgsCnt", intValue(item, "newFrcsRgsCnt"))
                        .addValue("ctrtEndCnt", intValue(item, "ctrtEndCnt"))
                        .addValue("ctrtCncltnCnt", intValue(item, "ctrtCncltnCnt"))
                        .addValue("nmChgCnt", intValue(item, "nmChgCnt"))
                        .addValue("avrgSlsAmt", longValue(item, "avrgSlsAmt"))
                        .addValue("arUnitAvrgSlsAmt", longValue(item, "arUnitAvrgSlsAmt"))
        );
    }

    public static Long longValue(Map<String, String> item, String key) {
        String normalized = normalizeNumber(item.get(key));
        if (normalized == null) {
            return null;
        }
        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    public static Integer intValue(Map<String, String> item, String key) {
        Long value = longValue(item, key);
        return value == null ? null : value.intValue();
    }

    private static String normalizeNumber(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim().replace(",", "");
        if (trimmed.isEmpty() || "-".equals(trimmed)) {
            return null;
        }
        return trimmed;
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }

    static MarketIndustryMapping marketIndustryMapping(String indutyMlsfcNm) {
        return MARKET_INDUSTRY_MAPPINGS.get(indutyMlsfcNm);
    }

    record MarketIndustryMapping(String code, String name) {
    }
}
