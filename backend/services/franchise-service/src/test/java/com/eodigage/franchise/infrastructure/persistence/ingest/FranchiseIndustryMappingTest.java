package com.eodigage.franchise.infrastructure.persistence.ingest;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FranchiseIndustryMappingTest {

    @Test
    void marketIndustryMapping은_공정위_중분류를_상권분석_업종으로_매핑한다() {
        FranchiseIngestJdbcRepository.MarketIndustryMapping coffee =
                FranchiseIngestJdbcRepository.marketIndustryMapping("커피");
        FranchiseIngestJdbcRepository.MarketIndustryMapping grocery =
                FranchiseIngestJdbcRepository.marketIndustryMapping("종합소매점");

        assertThat(coffee.code()).isEqualTo("CS100010");
        assertThat(coffee.name()).isEqualTo("커피-음료");
        assertThat(grocery.code()).isEqualTo("CS300001");
        assertThat(grocery.name()).isEqualTo("슈퍼마켓");
    }

    @Test
    void marketIndustryMapping은_상권분석에_대응되지_않는_중분류를_null로_둔다() {
        assertThat(FranchiseIngestJdbcRepository.marketIndustryMapping("기타 소매")).isNull();
        assertThat(FranchiseIngestJdbcRepository.marketIndustryMapping("배달")).isNull();
    }
}
