package com.eodigage.market.infrastructure.client;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.eodigage.market.api.recommendation.dto.RecommendedFranchise;

import lombok.extern.slf4j.Slf4j;

/**
 * franchise-service에서 특정 상권 업종에 맞는 프랜차이즈 브랜드를 조회한다.
 *
 * <p>리포트 응답 경로에서 동기 호출되므로 connect/read 타임아웃을 둬서
 * franchise-service 지연이 market-service 요청과 DB 커넥션을 오래 붙잡지 않게 한다.
 */
@Component
@Slf4j
public class FranchiseClient {

    private final RestClient restClient;

    public FranchiseClient(
            @Value("${market.franchise.base-url}") String baseUrl,
            @Value("${market.franchise.connect-timeout-ms:2000}") int connectTimeoutMs,
            @Value("${market.franchise.read-timeout-ms:3000}") int readTimeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    /**
     * 요청 size를 franchise-service에 그대로 전달한다.
     *
     * <p>결과 개수 설정은 market.franchise.recommend-size 한 곳에서 관리하고,
     * franchise-service는 전달받은 size를 SQL LIMIT으로 사용한다.
     */
    public List<RecommendedFranchise> findTopBrandsByIndustry(String marketIndustryCode, int size) {
        if (marketIndustryCode == null || marketIndustryCode.isBlank()) {
            return List.of();
        }
        try {
            FranchiseBrandList result = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/api/v1/franchises")
                            .queryParam("industryCode", marketIndustryCode)
                            .queryParam("size", size)
                            .build())
                    .retrieve()
                    .body(FranchiseBrandList.class);

            if (result == null || result.items() == null) {
                return List.of();
            }
            return result.items().stream()
                    .map(item -> new RecommendedFranchise(
                            item.brandCode(),
                            item.brandName(),
                            item.companyName(),
                            item.sales() == null ? null : item.sales().averageSalesAmount(),
                            item.startupCost() == null ? null : item.startupCost().totalAmount(),
                            item.sales() == null ? null : item.sales().franchiseCount()
                    ))
                    .toList();
        } catch (RuntimeException exception) {
            log.warn("franchise-service 브랜드 조회 실패. industryCode={}, message={}",
                    marketIndustryCode, exception.getMessage());
            return List.of();
        }
    }

    private record FranchiseBrandList(List<Item> items) {

        private record Item(
                String brandCode,
                String brandName,
                String companyName,
                StartupCost startupCost,
                Sales sales
        ) {
        }

        private record StartupCost(Long totalAmount) {
        }

        private record Sales(Long averageSalesAmount, Integer franchiseCount) {
        }
    }
}
