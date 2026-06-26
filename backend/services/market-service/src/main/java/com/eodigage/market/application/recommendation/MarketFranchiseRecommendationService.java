package com.eodigage.market.application.recommendation;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.eodigage.market.api.recommendation.dto.RecommendedFranchise;
import com.eodigage.market.infrastructure.client.FranchiseClient;

import lombok.RequiredArgsConstructor;

/**
 * 상권(행정동) 프랜차이즈 추천 조립 서비스.
 *
 * <p>주어진 업종(추정매출 1위)의 프랜차이즈 브랜드를 franchise-service에서 추정매출 높은 순으로 가져온다.
 * 1위 업종은 호출 측(리포트)이 이미 계산한 값을 넘겨받아 사용한다(같은 쿼리를 다시 실행하지 않는다).
 */
@Service
@RequiredArgsConstructor
public class MarketFranchiseRecommendationService {

    private final FranchiseClient franchiseClient;

    @Value("${market.franchise.recommend-size:10}")
    private int recommendSize;

    /** 업종(svc_induty_cd)으로 프랜차이즈 브랜드를 추천한다(추정매출 내림차순). 업종이 없으면 빈 목록. */
    public List<RecommendedFranchise> recommendByIndustry(String industryCode) {
        return franchiseClient.findTopBrandsByIndustry(industryCode, recommendSize);
    }
}
