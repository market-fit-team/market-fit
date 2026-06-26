package com.eodigage.market.application.recommendation;

import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.eodigage.market.infrastructure.client.FranchiseClient;

@ExtendWith(MockitoExtension.class)
class MarketFranchiseRecommendationServiceTest {

    @Mock
    private FranchiseClient franchiseClient;

    @Test
    void recommendByIndustry_passesConfiguredSizeToFranchiseClient() {
        MarketFranchiseRecommendationService service = new MarketFranchiseRecommendationService(franchiseClient);
        ReflectionTestUtils.setField(service, "recommendSize", 37);

        service.recommendByIndustry("CS100010");

        verify(franchiseClient).findTopBrandsByIndustry("CS100010", 37);
    }
}
