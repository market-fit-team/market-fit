package com.eodigage.market.application.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.eodigage.market.api.report.dto.MarketReportResponse;
import com.eodigage.market.core.common.exception.MarketResourceNotFoundException;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.DongRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.FloatingPopulationRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.IndustrySalesRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.IndustryStoreRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.PeriodRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.SalesAggregateRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.TradeAreaChangeRow;

@ExtendWith(MockitoExtension.class)
class MarketReportQueryServiceTest {

    @Mock
    private MarketReportJdbcRepository repository;

    @InjectMocks
    private MarketReportQueryService service;

    @Test
    void 상권리포트_파생필드를_계산해_조립한다() {
        givenDongAndLatestPeriod();
        given(repository.findPreviousPeriodId(10L)).willReturn(Optional.of(9L));
        given(repository.findFloatingPopulation(1L, 10L)).willReturn(Optional.of(sampleFloating()));
        given(repository.findIndustrySalesAggregate(1L, 10L)).willReturn(Optional.of(
                new SalesAggregateRow(1000L, 500L, 600L, 400L)
        ));
        given(repository.findTopIndustrySalesByAmount(1L, 10L, 9L)).willReturn(List.of(
                new IndustrySalesRow("CS100", "한식음식점", 300L, 50L, 180L, 120L, 200L, 10L)
        ));
        given(repository.findIndustryStores(1L, 10L)).willReturn(List.of(
                new IndustryStoreRow("A", "업종A", 100L, 90L, 10L,
                        new BigDecimal("10.5"), 5L, new BigDecimal("2.0"), 1L),
                new IndustryStoreRow("B", "업종B", 50L, 30L, 20L,
                        new BigDecimal("20.0"), 8L, new BigDecimal("5.0"), 3L)
        ));
        given(repository.findTradeAreaChange(1L, 10L)).willReturn(Optional.of(
                new TradeAreaChangeRow("HH", "정체", null, null, null, null)
        ));

        MarketReportResponse report = service.getReport("11680511", "latest");

        // 유동인구 파생 필드
        MarketReportResponse.FloatingPopulationSection floating = report.floatingPopulation();
        assertThat(floating.peakTimeSlot()).isEqualTo("11-14");
        assertThat(floating.peakWeekday()).isEqualTo("WED");
        assertThat(floating.youngAdultRatio()).isEqualByComparingTo("50.00");

        // 매출 비율 + 랭킹 파생 필드
        MarketReportResponse.SalesSection sales = report.sales();
        assertThat(sales.weekdaySalesRatio()).isEqualByComparingTo("60.00");
        assertThat(sales.weekendSalesRatio()).isEqualByComparingTo("40.00");
        MarketReportResponse.SalesRankingItem topSales = sales.industryRankings().get(0);
        assertThat(topSales.rank()).isEqualTo(1);
        assertThat(topSales.previousPeriodChangeRate()).isEqualByComparingTo("50.00");
        assertThat(topSales.estimatedSalesPerStore()).isEqualTo(30L);

        // 점포 집계 + Top3 정렬
        MarketReportResponse.StoreSection stores = report.stores();
        assertThat(stores.totalStores()).isEqualTo(150L);
        assertThat(stores.franchiseStores()).isEqualTo(30L);
        assertThat(stores.highOpenRateTop3().get(0).industryCode()).isEqualTo("B");
        assertThat(stores.lowClosureRateTop3().get(0).industryCode()).isEqualTo("A");
        assertThat(stores.highClosureRateTop3().get(0).industryCode()).isEqualTo("B");

        // 상권변화 표시 문구
        assertThat(report.tradeAreaChange().displayDescription())
                .isEqualTo("진입과 철수가 모두 신중해야 하는 경쟁 밀집 상권입니다.");

        // 데이터 누락 섹션(상주인구 미수집)
        assertThat(report.dataQuality().missingSections()).contains("residentPopulation");
        assertThat(report.dataQuality().availableSections())
                .contains("floatingPopulation", "sales", "stores", "tradeAreaChange");
    }

    @Test
    void 집계와_이전분기와_점포수가_없으면_파생필드를_null로_둔다() {
        givenDongAndLatestPeriod();
        // findPreviousPeriodId 미스텁 -> Optional.empty() -> previousPeriodId = null
        // findIndustrySalesAggregate, findFloatingPopulation 등 미스텁 -> 빈 결과
        given(repository.findTopIndustrySalesByAmount(eq(1L), eq(10L), isNull())).willReturn(List.of(
                new IndustrySalesRow("CS100", "한식음식점", 300L, 50L, 180L, 120L, null, 0L)
        ));

        MarketReportResponse report = service.getReport("11680511", "latest");

        // 수집 row가 없는 섹션은 null
        assertThat(report.floatingPopulation()).isNull();
        assertThat(report.residentPopulation()).isNull();
        assertThat(report.tradeAreaChange()).isNull();

        // 집계가 없으면 합계/비율은 null (0으로 채우지 않는다)
        MarketReportResponse.SalesSection sales = report.sales();
        assertThat(sales.totalSalesAmount()).isNull();
        assertThat(sales.weekdaySalesRatio()).isNull();
        assertThat(sales.weekendSalesRatio()).isNull();

        // 이전 분기 매출이 없으면 증감률 null, 점포수 0이면 점포당 매출 null
        MarketReportResponse.SalesRankingItem item = sales.industryRankings().get(0);
        assertThat(item.previousPeriodChangeRate()).isNull();
        assertThat(item.estimatedSalesPerStore()).isNull();

        assertThat(report.dataQuality().missingSections())
                .contains("floatingPopulation", "residentPopulation", "stores", "tradeAreaChange");
        assertThat(report.dataQuality().availableSections()).contains("sales");
    }

    @Test
    void 미리보기는_매출_랭킹만_반환한다() {
        givenDongAndLatestPeriod();
        given(repository.findPreviousPeriodId(10L)).willReturn(Optional.of(9L));
        given(repository.findTopIndustrySalesByAmount(1L, 10L, 9L)).willReturn(List.of(
                new IndustrySalesRow("CS100", "한식음식점", 300L, 50L, 180L, 120L, 200L, 10L),
                new IndustrySalesRow("CS200", "카페", 150L, 30L, 90L, 60L, 100L, 5L)
        ));

        var preview = service.getPreview("11680511", "latest");

        assertThat(preview.industryRankings()).hasSize(2);
        assertThat(preview.industryRankings().get(0).rank()).isEqualTo(1);
        assertThat(preview.industryRankings().get(0).industryCode()).isEqualTo("CS100");
        assertThat(preview.industryRankings().get(1).rank()).isEqualTo(2);
    }

    @Test
    void 행정동이_없으면_MARKET_DONG_NOT_FOUND_예외를_던진다() {
        given(repository.findDongByCode("99999999")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getReport("99999999", "latest"))
                .isInstanceOf(MarketResourceNotFoundException.class)
                .extracting("code")
                .isEqualTo("MARKET_DONG_NOT_FOUND");
    }

    @Test
    void 행정동은_있지만_리포트가_없으면_MARKET_REPORT_NOT_FOUND_예외를_던진다() {
        given(repository.findDongByCode("11680511")).willReturn(Optional.of(sampleDong()));
        given(repository.findLatestReportPeriod(1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getReport("11680511", "latest"))
                .isInstanceOf(MarketResourceNotFoundException.class)
                .extracting("code")
                .isEqualTo("MARKET_REPORT_NOT_FOUND");
    }

    @Test
    void 지정한_기준분기가_없으면_MARKET_PERIOD_NOT_FOUND_예외를_던진다() {
        given(repository.findDongByCode("11680511")).willReturn(Optional.of(sampleDong()));
        given(repository.findPeriodByStdrYyquCd("20231")).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.getReport("11680511", "20231"))
                .isInstanceOf(MarketResourceNotFoundException.class)
                .extracting("code")
                .isEqualTo("MARKET_PERIOD_NOT_FOUND");
    }

    private void givenDongAndLatestPeriod() {
        given(repository.findDongByCode("11680511")).willReturn(Optional.of(sampleDong()));
        given(repository.findLatestReportPeriod(1L)).willReturn(Optional.of(
                new PeriodRow(10L, "20241", "20241", 2024, 1)
        ));
    }

    private DongRow sampleDong() {
        return new DongRow(
                1L, "11680511", "개포3동", "11680511", "개포3동",
                "11680", "강남구", new BigDecimal("37.4900"), new BigDecimal("127.0600")
        );
    }

    private FloatingPopulationRow sampleFloating() {
        return new FloatingPopulationRow(
                1000L, 400L, 600L,
                100L, 200L, 300L, 150L, 150L, 100L,
                10L, 20L, 300L, 100L, 200L, 50L,
                10L, 20L, 500L, 40L, 50L, 60L, 70L
        );
    }
}
