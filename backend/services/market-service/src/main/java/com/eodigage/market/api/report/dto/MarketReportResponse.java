package com.eodigage.market.api.report.dto;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "행정동 상권상세 리포트 데이터")
public record MarketReportResponse(
        DongSummary dong,
        PeriodSummary period,
        FloatingPopulationSection floatingPopulation,
        ResidentPopulationSection residentPopulation,
        SalesSection sales,
        StoreSection stores,
        TradeAreaChangeSection tradeAreaChange,
        DataQualitySection dataQuality
) {

    public record DongSummary(
            String dongCode,
            String dongName,
            String sigunguCode,
            String sigunguName,
            BigDecimal centerLat,
            BigDecimal centerLng
    ) {
    }

    public record PeriodSummary(
            String periodKey,
            String stdrYyquCd,
            Integer year,
            Integer quarter
    ) {
    }

    public record FloatingPopulationSection(
            Long total,
            List<GenderMetric> gender,
            List<AgeMetric> ageGroups,
            List<TimeSlotMetric> timeSlots,
            String peakTimeSlot,
            String peakWeekday,
            BigDecimal youngAdultRatio
    ) {
    }

    public record ResidentPopulationSection(
            Long total,
            List<GenderAgeMetric> genderAgeGroups
    ) {
    }

    public record SalesSection(
            Long totalSalesAmount,
            Long totalSalesCount,
            Long weekdaySalesAmount,
            Long weekendSalesAmount,
            BigDecimal weekdaySalesRatio,
            BigDecimal weekendSalesRatio,
            List<SalesRankingItem> industryRankings
    ) {
    }

    public record StoreSection(
            Long totalStores,
            Long franchiseStores,
            Long openedStores,
            Long closedStores,
            List<StoreRankingItem> lowClosureRateTop3,
            List<StoreRankingItem> highClosureRateTop3,
            List<StoreRankingItem> highOpenRateTop3
    ) {
    }

    public record TradeAreaChangeSection(
            String changeIndex,
            String changeIndexName,
            String displayDescription,
            BigDecimal operationMonthsAverage,
            BigDecimal closureMonthsAverage,
            BigDecimal seoulOperationMonthsAverage,
            BigDecimal seoulClosureMonthsAverage
    ) {
    }

    public record DataQualitySection(
            List<String> availableSections,
            List<String> missingSections,
            String note
    ) {
    }

    public record GenderMetric(String gender, Long count, BigDecimal ratio) {
    }

    public record AgeMetric(String ageGroup, Long count, BigDecimal ratio) {
    }

    public record GenderAgeMetric(String gender, String ageGroup, Long count) {
    }

    public record TimeSlotMetric(String timeSlot, Long count, BigDecimal ratio) {
    }

    public record SalesRankingItem(
            Integer rank,
            String industryCode,
            String industryName,
            Long estimatedSalesAmount,
            Long salesCount,
            BigDecimal previousPeriodChangeRate,
            Long storeCount,
            Long estimatedSalesPerStore
    ) {
    }

    public record StoreRankingItem(
            Integer rank,
            String industryCode,
            String industryName,
            Long totalStores,
            Long franchiseStores,
            BigDecimal openRate,
            Long openedStores,
            BigDecimal closeRate,
            Long closedStores
    ) {
    }
}
