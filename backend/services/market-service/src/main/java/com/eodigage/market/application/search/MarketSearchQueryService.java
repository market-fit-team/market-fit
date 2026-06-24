package com.eodigage.market.application.search;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.eodigage.market.api.search.dto.AreaSearchResponse;
import com.eodigage.market.api.search.dto.AreaSearchResponse.AreaItem;
import com.eodigage.market.core.common.exception.MarketBadRequestException;
import com.eodigage.market.core.common.exception.MarketResourceNotFoundException;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.AreaRow;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.IndustryAreaRow;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.IndustryRow;
import com.eodigage.market.infrastructure.persistence.search.MarketSearchJdbcRepository.PeriodRow;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketSearchQueryService {

    private static final String LATEST_PERIOD = "latest";

    private final MarketSearchJdbcRepository marketSearchJdbcRepository;

    /**
     * 상권(행정동) 검색 단일 진입점.
     *
     * <p>- {@code industryCode}가 있으면 해당 업종의 추정매출 Top{@code maxRank} 상권을 반환하며,
     *   {@code keyword}가 함께 오면 시군구/행정동명으로 추가 필터링한다.
     * <p>- {@code industryCode}가 없고 {@code keyword}만 있으면 이름 검색을 한다.
     * <p>- 둘 다 없으면 400.
     */
    public AreaSearchResponse searchAreas(
            String keyword,
            String industryCode,
            String period,
            int maxRank
    ) {
        String trimmedKeyword = trimToNull(keyword);
        String trimmedIndustryCode = trimToNull(industryCode);

        if (trimmedKeyword == null && trimmedIndustryCode == null) {
            throw new MarketBadRequestException(
                    "MARKET_INVALID_REQUEST",
                    "keyword 또는 industryCode 중 하나 이상이 필요합니다."
            );
        }

        if (trimmedIndustryCode != null) {
            return industrySearch(trimmedIndustryCode, trimmedKeyword, period, maxRank);
        }
        return nameSearch(trimmedKeyword);
    }

    private AreaSearchResponse nameSearch(String keyword) {
        // 이름 검색에서도 각 동의 추정매출 1위 업종/순위를 채운다.
        // 매출 적재 분기가 없으면 업종 필드는 비운 채 동 목록만 반환한다(404 아님).
        PeriodRow latestPeriod = marketSearchJdbcRepository.findLatestSalesPeriod().orElse(null);
        Long periodId = latestPeriod == null ? null : latestPeriod.id();

        List<AreaItem> areas = marketSearchJdbcRepository.searchAreasByName(keyword, periodId).stream()
                .map(this::toAreaItem)
                .toList();

        return new AreaSearchResponse(
                keyword,
                null,
                null,
                latestPeriod == null ? null : latestPeriod.periodKey(),
                latestPeriod == null ? null : latestPeriod.stdrYyquCd(),
                null,
                areas
        );
    }

    private AreaSearchResponse industrySearch(
            String industryCode,
            String keyword,
            String period,
            int maxRank
    ) {
        IndustryRow industry = marketSearchJdbcRepository.findIndustryByCode(industryCode)
                .orElseThrow(() -> new MarketResourceNotFoundException(
                        "MARKET_INDUSTRY_NOT_FOUND",
                        "업종을 찾을 수 없습니다. industryCode=" + industryCode
                ));
        PeriodRow reportPeriod = resolvePeriod(period);

        List<AreaItem> areas = marketSearchJdbcRepository
                .findTopAreasByIndustry(reportPeriod.id(), industry.id(), maxRank, keyword).stream()
                .map(row -> toAreaItem(row, industry))
                .toList();

        return new AreaSearchResponse(
                keyword,
                industry.code(),
                industry.name(),
                reportPeriod.periodKey(),
                reportPeriod.stdrYyquCd(),
                maxRank,
                areas
        );
    }

    private PeriodRow resolvePeriod(String period) {
        if (LATEST_PERIOD.equalsIgnoreCase(period)) {
            return marketSearchJdbcRepository.findLatestSalesPeriod()
                    .orElseThrow(() -> new MarketResourceNotFoundException(
                            "MARKET_REPORT_NOT_FOUND",
                            "추정매출 데이터가 적재된 기준 분기가 없습니다."
                    ));
        }

        return marketSearchJdbcRepository.findPeriodByStdrYyquCd(period)
                .orElseThrow(() -> new MarketResourceNotFoundException(
                        "MARKET_PERIOD_NOT_FOUND",
                        "기준 분기를 찾을 수 없습니다. period=" + period
                ));
    }

    private AreaItem toAreaItem(AreaRow row) {
        // 이름 검색: 해당 동의 추정매출 1위 업종. 매출 데이터가 없으면 업종/순위 모두 null.
        Integer rank = row.industryCode() == null ? null : 1;
        return new AreaItem(
                row.code(),
                row.name(),
                row.sigunguCode(),
                row.sigunguName(),
                row.centerLat(),
                row.centerLng(),
                row.industryCode(),
                row.industryName(),
                rank,
                row.estimatedSalesAmount()
        );
    }

    private AreaItem toAreaItem(IndustryAreaRow row, IndustryRow industry) {
        return new AreaItem(
                row.code(),
                row.name(),
                row.sigunguCode(),
                row.sigunguName(),
                row.centerLat(),
                row.centerLng(),
                industry.code(),
                industry.name(),
                row.rank(),
                row.estimatedSalesAmount()
        );
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
