package com.eodigage.franchise.infrastructure.persistence.ingest;

import static java.util.Map.entry;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

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

    private static final List<String> ETC_FOOD = List.of("기타 외식");
    private static final List<String> ETC_RETAIL = List.of("기타 도소매", "기타도소매");
    private static final List<String> ETC_SERVICE = List.of("기타 서비스");
    private static final List<String> ETC_EDUCATION = List.of("기타 교육");
    private static final List<String> FARM_AND_FISHERY = List.of("농수산물");
    private static final List<String> HEALTH_FOOD = List.of("(건강)식품", "건강식품");
    private static final List<String> CHILD_EDUCATION = List.of(
            "유아 관련(교육 외)", "유아 관련 (교육 외)", "유아 관련", "유아관련"
    );

    private static final Map<String, MarketIndustryMapping> DIRECT_BRAND_INDUSTRY_MAPPINGS = Map.ofEntries(
            entry("FB6d0e0ec487a8aba56b39742f8f8d47", new MarketIndustryMapping("CS300001", "슈퍼마켓")),
            entry("FB34f8605c1720d5e8ad236bfb8718d1", new MarketIndustryMapping("CS300001", "슈퍼마켓")),
            entry("FB04aef03146f7651432c62fcf8640ee", new MarketIndustryMapping("CS100008", "분식전문점")),
            entry("FB6eadc92c1b6104e67197500057b29b", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FB30da61c6e387e2f93f7c060b87006e", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FB477e662840aa7a9798f1d17037f9cc", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FB2d0373f2819b571dedd520d4500393", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FB88b599b0ab6fd9a6e6df03154e16ce", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FBe3f038fa66d31bf103f3d301707543", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FB810e7cddaed34badb907554c899615", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FBf3341e830ccdac64a6f84f935ea554", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FB88529c4b5076f7949635e5554a12a7", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FB8806d9d481e5e7dede1aca41eafbce", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FBa863c061bd50326cab3a6523f8ee99", new MarketIndustryMapping("CS100001", "한식음식점")),
            entry("FBa3d5bbb2384b48a952f5f2b160ddcd", new MarketIndustryMapping("CS100004", "양식음식점")),
            entry("FB22475da13a52c32f8b0d6212cac113", new MarketIndustryMapping("CS100009", "호프-간이주점")),
            entry("FB5df8202f6a121d0a54771adb0d17f4", new MarketIndustryMapping("CS300016", "안경")),
            entry("FBd933e16454f4238d95855595a3376c", new MarketIndustryMapping("CS300017", "시계및귀금속")),
            entry("FB42419010a58a1e40f3a1a831a0dddb", new MarketIndustryMapping("CS300017", "시계및귀금속"))
    );

    private static final List<BrandIndustryRule> BRAND_INDUSTRY_RULES = List.of(
            rule(10, ETC_FOOD, "떡볶이|분식|김밥|순대|핫도그|토스트|꼬마김밥|쫄면|만두|교자|찐빵", "CS100008", "분식전문점"),
            rule(10, ETC_FOOD, "치킨|통닭|닭강정|후라이드|chicken|닭|강정|꼬꼬", "CS100007", "치킨전문점"),
            rule(10, ETC_FOOD, "커피|coffee|카페|에스프레소|라떼|아메리카노|다방|크리머리|밀크티|버블티|밀크랜드", "CS100010", "커피-음료"),
            rule(12, ETC_FOOD, "요거트|그릭|요거|스무디|주스|쥬스|에이드", "CS100010", "커피-음료"),
            rule(10, ETC_FOOD, "돈까스|돈가스|카츠|스시|초밥|라멘|우동|소바|규동|참치|이자카야|야끼|오마카세|텐동|벤또|돈부리|오니기리|유부|복어|문어|규카츠|타코야끼", "CS100003", "일식음식점"),
            rule(10, ETC_FOOD, "짜장|짜장면|짬뽕|중식|마라|훠궈|양꼬치|딤섬|중화", "CS100002", "중식음식점"),
            rule(10, ETC_FOOD, "파스타|피자|스테이크|샐러드|포케|브런치|경양식|리조또|에그|함바그|함박|타코|부리또|멕시|보울|bowl|커리|카레|사라다|샌드위치|피쉬|쌀국수", "CS100004", "양식음식점"),
            rule(9, ETC_FOOD, "버거|햄버거|버겨", "CS100006", "패스트푸드점"),
            rule(11, ETC_FOOD, "포차|포장마차|호프|맥주|술집|와인바|선술집|펍|막걸리|이자까야|주점", "CS100009", "호프-간이주점"),
            rule(10, ETC_FOOD, "베이커리|제과|도넛|도너츠|케이크|크로플|와플|타르트|디저트|빵|브레드|bread|꽈배기|호두과자|약과|모찌|마카롱", "CS100005", "제과점"),
            rule(20, ETC_FOOD, "국밥|한식|백반|한정식|갈비|불고기|족발|보쌈|곱창|막창|대창|닭발|대패|화로|삼계탕|한우|곰탕|설렁탕|해장국|감자탕|쌈밥|숯불|수육|두루치기|찜닭|아구찜|코다리|생선구이|국수|칼국수|냉면|돼지|소고기|고기|곱|닭갈비|찌개|전골|샤브|순두부|정육식당|밥상|식당|한솥|덮밥|쌈|회|초장|장어|민물|추어탕|동태|매운탕|우럭|솥밥|누룽지|미역|양푼|두껍삼|꼬치|탕|곳간|찜|볶|전집|면|구이|반상|한상|정식", "CS100001", "한식음식점"),
            rule(10, ETC_RETAIL, "꽃|플라워|flower|벌룬|풍선", "CS300028", "화초"),
            rule(10, ETC_RETAIL, "가구|퍼니처|furniture|커튼|블라인드|침대|매트리스", "CS300031", "가구"),
            rule(10, ETC_RETAIL, "펫|반려|애견|강아지|고양이|냥|견생|도그|dog|cat", "CS300029", "애완동물"),
            rule(10, ETC_RETAIL, "금거래소|금은방|귀금속|주얼리|쥬얼리|시계|watch|반지|미니골드|피어싱", "CS300017", "시계및귀금속"),
            rule(10, ETC_RETAIL, "안경|렌즈|아이웨어|optical|eye|비전|광학", "CS300016", "안경"),
            rule(10, ETC_RETAIL, "문구|아트박스|artbox|오피스|팬시|stationery", "CS300021", "문구"),
            rule(10, ETC_RETAIL, "정육|고기|미트|한우|축산|소고기|돼지|백정", "CS300007", "육류판매"),
            rule(10, ETC_RETAIL, "수산|회|대게|건어물|젓갈|꽃게|생선|해물|해산물", "CS300008", "수산물판매"),
            rule(10, ETC_RETAIL, "반찬|밑반찬|밀키트|밀킷|집밥|한끼", "CS300010", "반찬가게"),
            rule(10, ETC_RETAIL, "와인|주류|위스키|전통주|막걸리|liquor", "CS300005", "주류도매"),
            rule(10, ETC_RETAIL, "캠핑|골프|로스트볼|낚시|자전거|헬스용품", "CS300024", "운동/경기용품"),
            rule(10, ETC_RETAIL, "화장품|코스메틱|cosmetic|뷰티|향수|캔들|향초|디퓨저", "CS300022", "화장품"),
            rule(10, ETC_RETAIL, "의류|패션|wear|fashion|어패럴", "CS300011", "일반의류"),
            rule(10, ETC_RETAIL, "완구|장난감|토이|toy|키덜트", "CS300026", "완구"),
            rule(10, ETC_RETAIL, "서점|도서|book", "CS300020", "서적"),
            rule(10, ETC_RETAIL, "다이소|노브랜드|할인점|마켓|마트|슈퍼|편의|grocery|무인매장|무인점포", "CS300001", "슈퍼마켓"),
            rule(15, ETC_RETAIL, "떡|한과", "CS300006", "미곡판매"),
            rule(10, ETC_RETAIL, "폰|텔레콤|telecom", "CS300004", "핸드폰"),
            rule(10, ETC_RETAIL, "보청기", "CS300019", "의료기기"),
            rule(10, ETC_RETAIL, "신발|슈즈|shoe|운동화", "CS300014", "신발"),
            rule(10, ETC_RETAIL, "페인트|인테리어|타일|벽지", "CS300035", "인테리어"),
            rule(10, ETC_SERVICE, "스터디카페|스터디센터|독서실|스터디룸|study", "CS200038", "독서실"),
            rule(10, ETC_SERVICE, "노래연습장|노래방|노래타운|코인노래", "CS200037", "노래방"),
            rule(10, ETC_SERVICE, "스튜디오|셀프스튜디오|사진관|포토|photo|필름|증명사진|스냅|인생네컷|네컷|무인사진|셀프사진", "CS200041", "사진관"),
            rule(10, ETC_SERVICE, "청소|클린|clean|세스코|방역", "CS200043", "건축물청소"),
            rule(10, ETC_SERVICE, "호텔|hotel|노보텔|머큐어|레지던스|모텔|게하|게스트", "CS200034", "여관"),
            rule(10, ETC_SERVICE, "애견호텔|애견유치원|애견|펫|반려|강아지", "CS300029", "애완동물"),
            rule(10, ETC_SERVICE, "마사지|테라피|풋샵|스파|아로마|massage|경락|왁싱|에스테틱|피부", "CS200030", "피부관리실"),
            rule(10, ETC_SERVICE, "네일|nail", "CS200029", "네일숍"),
            rule(10, ETC_SERVICE, "세탁|빨래|런드리|laundry|크리닝|코인빨래방|빨래방|코인세탁", "CS200031", "세탁소"),
            rule(10, ETC_SERVICE, "세차|디테일링|카케어|타이어|정비", "CS200026", "자동차미용"),
            rule(10, ETC_SERVICE, "PC방|피씨방|피시방|피방", "CS200019", "PC방"),
            rule(10, ETC_SERVICE, "미용실|헤어|hair|바버|barber|이용원", "CS200028", "미용실"),
            rule(10, ETC_SERVICE, "헬스|피트니스|fitness|gym|필라테스|요가|크로스핏|다이어트|스쿼시|복싱|주짓수|클라이밍", "CS200024", "스포츠클럽"),
            rule(20, ETC_SERVICE, "만화카페|만화|도서대여|책대여", "CS200045", "비디오/서적임대"),
            rule(10, ETC_SERVICE, "키즈카페|놀이방|키즈", "CS200005", "스포츠 강습"),
            rule(10, ETC_EDUCATION, "영어|english|어학|외국어|중국어|일본어|토익|toeic", "CS200002", "외국어학원"),
            rule(10, ETC_EDUCATION, "미술|음악|피아노|무용|발레|댄스|art|예체능|드로잉|악기", "CS200003", "예술학원"),
            rule(10, ETC_EDUCATION, "코딩|컴퓨터|로봇|소프트웨어|coding", "CS200004", "컴퓨터학원"),
            rule(10, ETC_EDUCATION, "태권도|유도|검도|합기도|체육|수영", "CS200005", "스포츠 강습"),
            rule(20, ETC_EDUCATION, "학원|교습|공부방|수학|국어|논술|독서|학습|에듀|edu|교육|과외|입시|키즈|놀이|유아|어린이|영재|두뇌|사고력|한자|서예|바둑|웅변|글쓰기|독해|연산", "CS200001", "일반교습학원"),
            rule(10, FARM_AND_FISHERY, "수산|회|대게|건어물|생선|해물|해산물|젓갈", "CS300008", "수산물판매"),
            rule(10, FARM_AND_FISHERY, "정육|고기|한우|축산", "CS300007", "육류판매"),
            rule(10, FARM_AND_FISHERY, "과일|청과|fruit", "CS300009", "청과상"),
            rule(20, FARM_AND_FISHERY, "쌀|미곡|농산|곡물", "CS300006", "미곡판매"),
            rule(10, HEALTH_FOOD, "건강|홍삼|영양제|약초|한약|herb|supplement", "CS300018", "의약품"),
            rule(10, CHILD_EDUCATION, "영어|어학|학원|교습|미술|음악|코딩|놀이학교|유치원", "CS200001", "일반교습학원")
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
                    market_svc_induty_cd = COALESCE(
                        EXCLUDED.market_svc_induty_cd,
                        franchise_industries.market_svc_induty_cd
                    ),
                    market_svc_induty_cd_nm = COALESCE(
                        EXCLUDED.market_svc_induty_cd_nm,
                        franchise_industries.market_svc_induty_cd_nm
                    ),
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

    public Long upsertBrand(
            String brandCode,
            String brandName,
            String companyName,
            Long industryId,
            String indutyMlsfcNm
    ) {
        MarketIndustryMapping mapping = brandIndustryMapping(brandCode, indutyMlsfcNm, brandName, companyName);
        String sql = """
                INSERT INTO franchise_brands (
                    brand_code, brand_name, company_name, primary_industry_id,
                    market_svc_induty_cd, market_svc_induty_cd_nm
                )
                VALUES (
                    :brandCode, :brandName, :companyName, :industryId,
                    :marketSvcIndutyCd, :marketSvcIndutyCdNm
                )
                ON CONFLICT (brand_code) DO UPDATE SET
                    brand_name = EXCLUDED.brand_name,
                    company_name = EXCLUDED.company_name,
                    primary_industry_id = COALESCE(
                        franchise_brands.primary_industry_id,
                        EXCLUDED.primary_industry_id
                    ),
                    market_svc_induty_cd = COALESCE(
                        EXCLUDED.market_svc_induty_cd,
                        franchise_brands.market_svc_induty_cd
                    ),
                    market_svc_induty_cd_nm = COALESCE(
                        EXCLUDED.market_svc_induty_cd_nm,
                        franchise_brands.market_svc_induty_cd_nm
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
                        .addValue("industryId", industryId)
                        .addValue("marketSvcIndutyCd", mapping == null ? null : mapping.code())
                        .addValue("marketSvcIndutyCdNm", mapping == null ? null : mapping.name()),
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

    static MarketIndustryMapping brandIndustryMapping(
            String brandCode,
            String indutyMlsfcNm,
            String brandName,
            String companyName
    ) {
        MarketIndustryMapping directMapping = DIRECT_BRAND_INDUSTRY_MAPPINGS.get(brandCode);
        if (directMapping != null) {
            return directMapping;
        }

        String targetText = normalizeSearchText(brandName) + " " + normalizeSearchText(companyName);
        if (targetText.isBlank() || indutyMlsfcNm == null || indutyMlsfcNm.isBlank()) {
            return null;
        }

        BrandIndustryRule selectedRule = null;
        for (BrandIndustryRule rule : BRAND_INDUSTRY_RULES) {
            if (rule.matches(indutyMlsfcNm, targetText)
                    && (selectedRule == null || rule.priority() < selectedRule.priority())) {
                selectedRule = rule;
            }
        }
        return selectedRule == null ? null : selectedRule.mapping();
    }

    private static BrandIndustryRule rule(
            int priority,
            List<String> middleCategories,
            String pattern,
            String code,
            String name
    ) {
        return new BrandIndustryRule(
                priority,
                middleCategories,
                Pattern.compile(pattern, Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE),
                new MarketIndustryMapping(code, name)
        );
    }

    private static String normalizeSearchText(String value) {
        return value == null ? "" : value.trim();
    }

    private record BrandIndustryRule(
            int priority,
            List<String> middleCategories,
            Pattern pattern,
            MarketIndustryMapping mapping
    ) {
        boolean matches(String indutyMlsfcNm, String targetText) {
            return middleCategories.contains(indutyMlsfcNm) && pattern.matcher(targetText).find();
        }
    }

    record MarketIndustryMapping(String code, String name) {
    }
}
