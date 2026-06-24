package com.eodigage.market.application.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.eodigage.market.api.search.dto.AreaSearchResponse;
import com.eodigage.market.core.common.exception.MarketBadRequestException;
import com.eodigage.market.core.common.exception.MarketResourceNotFoundException;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.AreaRow;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.IndustryAreaRow;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.IndustryRow;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.PeriodRow;

@ExtendWith(MockitoExtension.class)
class MarketSearchQueryServiceTest {

    @Mock
    private MarketSearchJdbcRepository repository;

    @InjectMocks
    private MarketSearchQueryService service;

    @Test
    void keyword만_있으면_이름검색을_하고_각_동의_1위_업종을_채운다() {
        given(repository.findLatestSalesPeriod())
                .willReturn(Optional.of(new PeriodRow(10L, "20261", "20261")));
        given(repository.searchAreasByName("명일동", 10L)).willReturn(List.of(
                new AreaRow("11740530", "명일1동", "11740", "강동구",
                        new BigDecimal("37.5510"), new BigDecimal("127.1440"),
                        "CS100001", "한식음식점", 8_566_127_232L),
                new AreaRow("11740540", "명일2동", "11740", "강동구",
                        new BigDecimal("37.5570"), new BigDecimal("127.1470"),
                        null, null, null)
        ));

        AreaSearchResponse response = service.searchAreas("명일동", null, "latest", 3);

        assertThat(response.keyword()).isEqualTo("명일동");
        assertThat(response.industryCode()).isNull();
        assertThat(response.stdrYyquCd()).isEqualTo("20261");
        assertThat(response.maxRank()).isNull();
        assertThat(response.areas())
                .extracting(AreaSearchResponse.AreaItem::dongName)
                .containsExactly("명일1동", "명일2동");
        // 매출 데이터가 있는 동은 1위 업종 + rank=1
        assertThat(response.areas().get(0).industryName()).isEqualTo("한식음식점");
        assertThat(response.areas().get(0).rank()).isEqualTo(1);
        assertThat(response.areas().get(0).estimatedSalesAmount()).isEqualTo(8_566_127_232L);
        // 매출 데이터가 없는 동은 업종/순위 null
        assertThat(response.areas().get(1).industryName()).isNull();
        assertThat(response.areas().get(1).rank()).isNull();
    }

    @Test
    void industryCode가_있으면_업종_Top랭킹_상권을_반환한다() {
        given(repository.findIndustryByCode("CS100001"))
                .willReturn(Optional.of(new IndustryRow(7L, "CS100001", "한식음식점")));
        given(repository.findLatestSalesPeriod())
                .willReturn(Optional.of(new PeriodRow(10L, "20261", "20261")));
        given(repository.findTopAreasByIndustry(10L, 7L, 3, null)).willReturn(List.of(
                new IndustryAreaRow("11680640", "역삼1동", "11680", "강남구",
                        new BigDecimal("37.4998"), new BigDecimal("127.0320"), 1, 115_810_239_035L)
        ));

        AreaSearchResponse response = service.searchAreas(null, "CS100001", "latest", 3);

        assertThat(response.industryName()).isEqualTo("한식음식점");
        assertThat(response.stdrYyquCd()).isEqualTo("20261");
        assertThat(response.maxRank()).isEqualTo(3);
        assertThat(response.areas().get(0).dongName()).isEqualTo("역삼1동");
        assertThat(response.areas().get(0).rank()).isEqualTo(1);
        assertThat(response.areas().get(0).estimatedSalesAmount()).isEqualTo(115_810_239_035L);
    }

    @Test
    void keyword와_industryCode가_함께_오면_keyword를_업종쿼리에_전달한다() {
        given(repository.findIndustryByCode("CS100001"))
                .willReturn(Optional.of(new IndustryRow(7L, "CS100001", "한식음식점")));
        given(repository.findLatestSalesPeriod())
                .willReturn(Optional.of(new PeriodRow(10L, "20261", "20261")));
        given(repository.findTopAreasByIndustry(10L, 7L, 3, "강동구")).willReturn(List.of());

        AreaSearchResponse response = service.searchAreas("강동구", "CS100001", "latest", 3);

        assertThat(response.keyword()).isEqualTo("강동구");
        assertThat(response.industryCode()).isEqualTo("CS100001");
        verify(repository).findTopAreasByIndustry(10L, 7L, 3, "강동구");
    }

    @Test
    void keyword와_industryCode가_모두_없으면_MARKET_INVALID_REQUEST_예외를_던진다() {
        assertThatThrownBy(() -> service.searchAreas(null, "  ", "latest", 3))
                .isInstanceOf(MarketBadRequestException.class)
                .extracting("code")
                .isEqualTo("MARKET_INVALID_REQUEST");
    }

    @Test
    void 존재하지_않는_업종은_MARKET_INDUSTRY_NOT_FOUND_예외를_던진다() {
        given(repository.findIndustryByCode("UNKNOWN")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.searchAreas(null, "UNKNOWN", "latest", 3))
                .isInstanceOf(MarketResourceNotFoundException.class)
                .extracting("code")
                .isEqualTo("MARKET_INDUSTRY_NOT_FOUND");
    }

    @Test
    void 추정매출_분기가_없으면_MARKET_REPORT_NOT_FOUND_예외를_던진다() {
        given(repository.findIndustryByCode("CS100001"))
                .willReturn(Optional.of(new IndustryRow(7L, "CS100001", "한식음식점")));
        given(repository.findLatestSalesPeriod()).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.searchAreas(null, "CS100001", "latest", 3))
                .isInstanceOf(MarketResourceNotFoundException.class)
                .extracting("code")
                .isEqualTo("MARKET_REPORT_NOT_FOUND");
    }

    @Test
    void 지정한_기준분기가_없으면_MARKET_PERIOD_NOT_FOUND_예외를_던진다() {
        given(repository.findIndustryByCode("CS100001"))
                .willReturn(Optional.of(new IndustryRow(7L, "CS100001", "한식음식점")));
        given(repository.findPeriodByStdrYyquCd("20231")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.searchAreas(null, "CS100001", "20231", 3))
                .isInstanceOf(MarketResourceNotFoundException.class)
                .extracting("code")
                .isEqualTo("MARKET_PERIOD_NOT_FOUND");
    }
}
