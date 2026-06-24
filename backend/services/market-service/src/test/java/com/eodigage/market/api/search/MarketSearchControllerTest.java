package com.eodigage.market.api.search;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.eodigage.market.api.common.error.GlobalExceptionHandler;
import com.eodigage.market.api.search.dto.AreaSearchResponse;
import com.eodigage.market.api.search.dto.AreaSearchResponse.AreaItem;
import com.eodigage.market.application.search.MarketSearchQueryService;
import com.eodigage.market.core.common.exception.MarketBadRequestException;
import com.eodigage.market.core.common.exception.MarketResourceNotFoundException;

@WebMvcTest(controllers = MarketSearchController.class)
@Import(GlobalExceptionHandler.class)
class MarketSearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MarketSearchQueryService marketSearchQueryService;

    @Test
    void 이름검색_성공시_행정동_목록을_ApiResponse_래퍼로_응답한다() throws Exception {
        given(marketSearchQueryService.searchAreas(eq("도봉구"), isNull(), any(), anyInt()))
                .willReturn(new AreaSearchResponse(
                        "도봉구", null, null, "20261", "20261", null,
                        List.of(new AreaItem(
                                "11320520", "쌍문2동", "11320", "도봉구",
                                new BigDecimal("37.6500"), new BigDecimal("127.0300"),
                                "CS100001", "한식음식점", 1, 5_000_000_000L
                        ))
                ));

        mockMvc.perform(get("/api/v1/market-search/areas").param("keyword", "도봉구"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("성공"))
                .andExpect(jsonPath("$.data.keyword").value("도봉구"))
                .andExpect(jsonPath("$.data.industryCode").doesNotExist())
                .andExpect(jsonPath("$.data.areas[0].dongName").value("쌍문2동"))
                .andExpect(jsonPath("$.data.areas[0].industryName").value("한식음식점"))
                .andExpect(jsonPath("$.data.areas[0].rank").value(1));
    }

    @Test
    void 업종필터_성공시_순위정보를_포함해_응답한다() throws Exception {
        given(marketSearchQueryService.searchAreas(isNull(), eq("CS100001"), any(), anyInt()))
                .willReturn(new AreaSearchResponse(
                        null, "CS100001", "한식음식점", "20261", "20261", 3,
                        List.of(new AreaItem(
                                "11680640", "역삼1동", "11680", "강남구",
                                new BigDecimal("37.4998"), new BigDecimal("127.0320"),
                                "CS100001", "한식음식점", 1, 115_810_239_035L
                        ))
                ));

        mockMvc.perform(get("/api/v1/market-search/areas").param("industryCode", "CS100001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.industryName").value("한식음식점"))
                .andExpect(jsonPath("$.data.maxRank").value(3))
                .andExpect(jsonPath("$.data.areas[0].dongName").value("역삼1동"))
                .andExpect(jsonPath("$.data.areas[0].rank").value(1))
                .andExpect(jsonPath("$.data.areas[0].estimatedSalesAmount").value(115810239035L));
    }

    @Test
    void keyword와_industryCode가_모두_없으면_400_ProblemDetail을_반환한다() throws Exception {
        given(marketSearchQueryService.searchAreas(isNull(), isNull(), any(), anyInt()))
                .willThrow(new MarketBadRequestException(
                        "MARKET_INVALID_REQUEST",
                        "keyword 또는 industryCode 중 하나 이상이 필요합니다."
                ));

        mockMvc.perform(get("/api/v1/market-search/areas"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("MARKET_INVALID_REQUEST"));
    }

    @Test
    void 존재하지_않는_업종은_404_ProblemDetail을_반환한다() throws Exception {
        given(marketSearchQueryService.searchAreas(isNull(), eq("NOPE"), any(), anyInt()))
                .willThrow(new MarketResourceNotFoundException(
                        "MARKET_INDUSTRY_NOT_FOUND",
                        "업종을 찾을 수 없습니다. industryCode=NOPE"
                ));

        mockMvc.perform(get("/api/v1/market-search/areas").param("industryCode", "NOPE"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("MARKET_INDUSTRY_NOT_FOUND"));
    }

    @Test
    void maxRank가_3을_초과하면_400_ProblemDetail을_반환한다() throws Exception {
        mockMvc.perform(get("/api/v1/market-search/areas")
                        .param("industryCode", "CS100001")
                        .param("maxRank", "4"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("MARKET_INVALID_REQUEST"));
    }
}
