package com.eodigage.market.application.report;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eodigage.market.api.report.dto.MarketReportResponse;
import com.eodigage.market.api.report.dto.MarketReportPreviewResponse;
import com.eodigage.market.core.common.exception.MarketResourceNotFoundException;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.DongRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.FloatingPopulationRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.IndustrySalesRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.SalesAggregateRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.IndustryStoreRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.PeriodRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.ResidentPopulationRow;
import com.eodigage.market.infrastructure.persistence.report.MarketReportJdbcRepository.TradeAreaChangeRow;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketReportQueryService {

    private static final String LATEST_PERIOD = "latest";

    private final MarketReportJdbcRepository marketReportJdbcRepository;

    public MarketReportResponse getReport(String dongCode, String period) {
        DongRow dong = resolveDong(dongCode);
        PeriodRow reportPeriod = resolvePeriod(dong, period);
        Long previousPeriodId = marketReportJdbcRepository.findPreviousPeriodId(reportPeriod.id())
                .orElse(null);

        FloatingPopulationRow floating = marketReportJdbcRepository
                .findFloatingPopulation(dong.id(), reportPeriod.id())
                .orElse(null);
        ResidentPopulationRow resident = marketReportJdbcRepository
                .findResidentPopulation(dong.id(), reportPeriod.id())
                .orElse(null);
        SalesAggregateRow salesAggregate = marketReportJdbcRepository
                .findIndustrySalesAggregate(dong.id(), reportPeriod.id())
                .orElse(null);
        List<IndustrySalesRow> salesRankings = marketReportJdbcRepository
                .findTopIndustrySalesByAmount(dong.id(), reportPeriod.id(), previousPeriodId);
        List<IndustryStoreRow> stores = marketReportJdbcRepository
                .findIndustryStores(dong.id(), reportPeriod.id());
        TradeAreaChangeRow change = marketReportJdbcRepository
                .findTradeAreaChange(dong.id(), reportPeriod.id())
                .orElse(null);

        return new MarketReportResponse(
                toDongSummary(dong),
                toPeriodSummary(reportPeriod),
                toFloatingSection(floating),
                toResidentSection(resident),
                toSalesSection(salesAggregate, salesRankings),
                toStoreSection(stores),
                toTradeAreaChangeSection(change),
                toDataQualitySection(floating, resident, salesRankings, stores, change)
        );
    }

    public MarketReportPreviewResponse getPreview(String dongCode, String period) {
        DongRow dong = resolveDong(dongCode);
        PeriodRow reportPeriod = resolvePeriod(dong, period);
        Long previousPeriodId = marketReportJdbcRepository.findPreviousPeriodId(reportPeriod.id())
                .orElse(null);
        List<IndustrySalesRow> salesRankings = marketReportJdbcRepository
                .findTopIndustrySalesByAmount(dong.id(), reportPeriod.id(), previousPeriodId);

        return new MarketReportPreviewResponse(toSalesRankingItems(salesRankings));
    }

    private DongRow resolveDong(String dongCode) {
        return marketReportJdbcRepository.findDongByCode(dongCode)
                .orElseThrow(() -> new MarketResourceNotFoundException(
                        "MARKET_DONG_NOT_FOUND",
                        "행정동을 찾을 수 없습니다. dongCode=" + dongCode
                ));
    }

    private PeriodRow resolvePeriod(DongRow dong, String period) {
        if (LATEST_PERIOD.equalsIgnoreCase(period)) {
            return marketReportJdbcRepository.findLatestReportPeriod(dong.id())
                    .orElseThrow(() -> new MarketResourceNotFoundException(
                            "MARKET_REPORT_NOT_FOUND",
                            "해당 행정동의 상권상세 데이터가 없습니다. dongCode=" + dong.dongCode()
                    ));
        }

        return marketReportJdbcRepository.findPeriodByStdrYyquCd(period)
                .orElseThrow(() -> new MarketResourceNotFoundException(
                        "MARKET_PERIOD_NOT_FOUND",
                        "기준 분기를 찾을 수 없습니다. period=" + period
                ));
    }

    private MarketReportResponse.DongSummary toDongSummary(DongRow dong) {
        return new MarketReportResponse.DongSummary(
                dong.displayDongCode(),
                dong.displayDongName(),
                dong.sigunguCode(),
                dong.sigunguName(),
                dong.centerLat(),
                dong.centerLng()
        );
    }

    private MarketReportResponse.PeriodSummary toPeriodSummary(PeriodRow period) {
        return new MarketReportResponse.PeriodSummary(
                period.periodKey(),
                period.stdrYyquCd(),
                period.year(),
                period.quarter()
        );
    }

    private MarketReportResponse.FloatingPopulationSection toFloatingSection(
            FloatingPopulationRow row
    ) {
        if (row == null) {
            return null;
        }

        List<MarketReportResponse.TimeSlotMetric> timeSlots = List.of(
                timeSlot("00-06", row.time0006(), row.total()),
                timeSlot("06-11", row.time0611(), row.total()),
                timeSlot("11-14", row.time1114(), row.total()),
                timeSlot("14-17", row.time1417(), row.total()),
                timeSlot("17-21", row.time1721(), row.total()),
                timeSlot("21-24", row.time2124(), row.total())
        );
        Long youngAdultTotal = safeLong(row.age20()) + safeLong(row.age30());

        return new MarketReportResponse.FloatingPopulationSection(
                row.total(),
                List.of(
                        gender("male", row.male(), row.total()),
                        gender("female", row.female(), row.total())
                ),
                List.of(
                        age("10", row.age10(), row.total()),
                        age("20", row.age20(), row.total()),
                        age("30", row.age30(), row.total()),
                        age("40", row.age40(), row.total()),
                        age("50", row.age50(), row.total()),
                        age("60+", row.age60Above(), row.total())
                ),
                timeSlots,
                peakTimeSlot(timeSlots),
                peakWeekday(row),
                ratio(youngAdultTotal, row.total())
        );
    }

    private MarketReportResponse.ResidentPopulationSection toResidentSection(
            ResidentPopulationRow row
    ) {
        if (row == null) {
            return null;
        }

        return new MarketReportResponse.ResidentPopulationSection(
                row.total(),
                List.of(
                        new MarketReportResponse.GenderAgeMetric("male", "10", row.maleAge10()),
                        new MarketReportResponse.GenderAgeMetric("male", "20", row.maleAge20()),
                        new MarketReportResponse.GenderAgeMetric("male", "30", row.maleAge30()),
                        new MarketReportResponse.GenderAgeMetric("male", "40", row.maleAge40()),
                        new MarketReportResponse.GenderAgeMetric("male", "50", row.maleAge50()),
                        new MarketReportResponse.GenderAgeMetric("male", "60+", row.maleAge60Above()),
                        new MarketReportResponse.GenderAgeMetric("female", "10", row.femaleAge10()),
                        new MarketReportResponse.GenderAgeMetric("female", "20", row.femaleAge20()),
                        new MarketReportResponse.GenderAgeMetric("female", "30", row.femaleAge30()),
                        new MarketReportResponse.GenderAgeMetric("female", "40", row.femaleAge40()),
                        new MarketReportResponse.GenderAgeMetric("female", "50", row.femaleAge50()),
                        new MarketReportResponse.GenderAgeMetric("female", "60+", row.femaleAge60Above())
                )
        );
    }

    private MarketReportResponse.SalesSection toSalesSection(
            SalesAggregateRow aggregate,
            List<IndustrySalesRow> rows
    ) {
        Long totalSalesAmount = aggregate == null ? null : aggregate.totalSalesAmount();
        Long totalSalesCount = aggregate == null ? null : aggregate.totalSalesCount();
        Long weekdaySalesAmount = aggregate == null ? null : aggregate.weekdaySalesAmount();
        Long weekendSalesAmount = aggregate == null ? null : aggregate.weekendSalesAmount();

        return new MarketReportResponse.SalesSection(
                totalSalesAmount,
                totalSalesCount,
                weekdaySalesAmount,
                weekendSalesAmount,
                ratio(weekdaySalesAmount, totalSalesAmount),
                ratio(weekendSalesAmount, totalSalesAmount),
                toSalesRankingItems(rows)
        );
    }

    private List<MarketReportResponse.SalesRankingItem> toSalesRankingItems(
            List<IndustrySalesRow> rows
    ) {
        List<MarketReportResponse.SalesRankingItem> rankings = new ArrayList<>();
        for (int index = 0; index < rows.size(); index++) {
            IndustrySalesRow row = rows.get(index);
            rankings.add(new MarketReportResponse.SalesRankingItem(
                    index + 1,
                    row.industryCode(),
                    row.industryName(),
                    row.salesAmount(),
                    row.salesCount(),
                    changeRate(row.salesAmount(), row.previousSalesAmount()),
                    row.storeCount(),
                    salesPerStore(row.salesAmount(), row.storeCount())
            ));
        }
        return rankings;
    }

    private MarketReportResponse.StoreSection toStoreSection(List<IndustryStoreRow> rows) {
        Long totalStores = rows.stream()
                .map(IndustryStoreRow::totalStores)
                .mapToLong(this::safeLong)
                .sum();
        Long franchiseStores = rows.stream()
                .map(IndustryStoreRow::franchiseStores)
                .mapToLong(this::safeLong)
                .sum();
        Long openedStores = rows.stream()
                .map(IndustryStoreRow::openedStores)
                .mapToLong(this::safeLong)
                .sum();
        Long closedStores = rows.stream()
                .map(IndustryStoreRow::closedStores)
                .mapToLong(this::safeLong)
                .sum();

        return new MarketReportResponse.StoreSection(
                totalStores,
                franchiseStores,
                openedStores,
                closedStores,
                storeTop3(
                        rows.stream().filter(row -> row.closeRate() != null).toList(),
                        Comparator.comparing(
                                IndustryStoreRow::closeRate,
                                Comparator.nullsLast(BigDecimal::compareTo)
                        ).thenComparing(
                                IndustryStoreRow::closedStores,
                                Comparator.nullsLast(Long::compareTo)
                        )
                ),
                storeTop3(
                        rows.stream().filter(row -> row.closeRate() != null).toList(),
                        Comparator.comparing(
                                IndustryStoreRow::closeRate,
                                Comparator.nullsLast(BigDecimal::compareTo)
                        ).reversed().thenComparing(
                                IndustryStoreRow::closedStores,
                                Comparator.nullsLast(Long::compareTo).reversed()
                        )
                ),
                storeTop3(
                        rows.stream().filter(row -> row.openRate() != null).toList(),
                        Comparator.comparing(
                                IndustryStoreRow::openRate,
                                Comparator.nullsLast(BigDecimal::compareTo)
                        ).reversed().thenComparing(
                                IndustryStoreRow::openedStores,
                                Comparator.nullsLast(Long::compareTo).reversed()
                        )
                )
        );
    }

    private MarketReportResponse.TradeAreaChangeSection toTradeAreaChangeSection(
            TradeAreaChangeRow row
    ) {
        if (row == null) {
            return null;
        }

        return new MarketReportResponse.TradeAreaChangeSection(
                row.changeIndex(),
                row.changeIndexName(),
                tradeAreaChangeDescription(row.changeIndex()),
                row.operationMonthsAverage(),
                row.closureMonthsAverage(),
                row.seoulOperationMonthsAverage(),
                row.seoulClosureMonthsAverage()
        );
    }

    private MarketReportResponse.DataQualitySection toDataQualitySection(
            FloatingPopulationRow floating,
            ResidentPopulationRow resident,
            List<IndustrySalesRow> sales,
            List<IndustryStoreRow> stores,
            TradeAreaChangeRow change
    ) {
        List<String> available = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        markSection("floatingPopulation", floating != null, available, missing);
        markSection("residentPopulation", resident != null, available, missing);
        markSection("sales", !sales.isEmpty(), available, missing);
        markSection("stores", !stores.isEmpty(), available, missing);
        markSection("tradeAreaChange", change != null, available, missing);

        return new MarketReportResponse.DataQualitySection(
                available,
                missing,
                "missingSections는 해당 기간/행정동에 수집 row가 없는 섹션입니다."
        );
    }

    private void markSection(
            String name,
            boolean exists,
            List<String> available,
            List<String> missing
    ) {
        if (exists) {
            available.add(name);
            return;
        }
        missing.add(name);
    }

    private MarketReportResponse.GenderMetric gender(String gender, Long count, Long total) {
        return new MarketReportResponse.GenderMetric(gender, count, ratio(count, total));
    }

    private MarketReportResponse.AgeMetric age(String ageGroup, Long count, Long total) {
        return new MarketReportResponse.AgeMetric(ageGroup, count, ratio(count, total));
    }

    private MarketReportResponse.TimeSlotMetric timeSlot(String timeSlot, Long count, Long total) {
        return new MarketReportResponse.TimeSlotMetric(timeSlot, count, ratio(count, total));
    }

    private List<MarketReportResponse.StoreRankingItem> storeTop3(
            List<IndustryStoreRow> rows,
            Comparator<IndustryStoreRow> comparator
    ) {
        List<IndustryStoreRow> topRows = rows.stream()
                .sorted(comparator)
                .limit(3)
                .toList();

        List<MarketReportResponse.StoreRankingItem> rankings = new ArrayList<>();
        for (int index = 0; index < topRows.size(); index++) {
            IndustryStoreRow row = topRows.get(index);
            rankings.add(new MarketReportResponse.StoreRankingItem(
                    index + 1,
                    row.industryCode(),
                    row.industryName(),
                    row.totalStores(),
                    row.franchiseStores(),
                    row.openRate(),
                    row.openedStores(),
                    row.closeRate(),
                    row.closedStores()
            ));
        }
        return rankings;
    }

    private String peakTimeSlot(List<MarketReportResponse.TimeSlotMetric> timeSlots) {
        return timeSlots.stream()
                .filter(metric -> metric.count() != null)
                .max((left, right) -> Long.compare(left.count(), right.count()))
                .map(MarketReportResponse.TimeSlotMetric::timeSlot)
                .orElse(null);
    }

    private String peakWeekday(FloatingPopulationRow row) {
        List<WeekdayCount> weekdays = List.of(
                new WeekdayCount("MON", row.mon()),
                new WeekdayCount("TUE", row.tue()),
                new WeekdayCount("WED", row.wed()),
                new WeekdayCount("THU", row.thu()),
                new WeekdayCount("FRI", row.fri()),
                new WeekdayCount("SAT", row.sat()),
                new WeekdayCount("SUN", row.sun())
        );

        return weekdays.stream()
                .filter(weekday -> weekday.count() != null)
                .max((left, right) -> Long.compare(left.count(), right.count()))
                .map(WeekdayCount::weekday)
                .orElse(null);
    }

    private String tradeAreaChangeDescription(String changeIndex) {
        if (changeIndex == null) {
            return null;
        }
        return switch (changeIndex) {
            case "LL" -> "신규 개발과 변화 가능성이 큰 상권입니다.";
            case "LH" -> "신규 업체 진입은 활발하지만 폐업 위험도 함께 살펴야 하는 상권입니다.";
            case "HL" -> "기존 업체의 영업 지속성이 비교적 강한 상권입니다.";
            case "HH" -> "진입과 철수가 모두 신중해야 하는 경쟁 밀집 상권입니다.";
            default -> null;
        };
    }

    private BigDecimal ratio(Long count, Long total) {
        if (count == null || total == null || total == 0) {
            return null;
        }
        return BigDecimal.valueOf(count)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal changeRate(Long current, Long previous) {
        if (current == null || previous == null || previous == 0) {
            return null;
        }
        return BigDecimal.valueOf(current - previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(previous), 2, RoundingMode.HALF_UP);
    }

    private Long salesPerStore(Long salesAmount, Long storeCount) {
        if (salesAmount == null || storeCount == null || storeCount == 0) {
            return null;
        }
        return salesAmount / storeCount;
    }

    private long safeLong(Long value) {
        return value == null ? 0 : value;
    }

    private record WeekdayCount(String weekday, Long count) {
    }
}
