package com.eodigage.market.api.report;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import com.eodigage.market.api.common.error.GlobalExceptionHandler;
import com.eodigage.market.api.report.dto.MarketReportPreviewResponse;
import com.eodigage.market.api.report.dto.MarketReportResponse;
import com.eodigage.market.application.report.MarketReportQueryService;
import com.eodigage.market.core.common.exception.MarketResourceNotFoundException;

@WebMvcTest(controllers = MarketReportController.class)
@Import(GlobalExceptionHandler.class)
class MarketReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MarketReportQueryService marketReportQueryService;

    @Test
    void 상권리포트_조회_성공시_ApiResponse_래퍼로_응답한다() throws Exception {
        given(marketReportQueryService.getReport(any(), any())).willReturn(sampleReport());

        mockMvc.perform(get("/api/v1/market-reports/dongs/{dongCode}", "11680511"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("성공"))
                .andExpect(jsonPath("$.data.dong.dongCode").value("11680511"))
                .andExpect(jsonPath("$.data.dong.dongName").value("개포3동"));
    }

    @Test
    void 행정동이_없으면_404_ProblemDetail을_반환한다() throws Exception {
        given(marketReportQueryService.getReport(any(), any()))
                .willThrow(new MarketResourceNotFoundException(
                        "MARKET_DONG_NOT_FOUND",
                        "행정동을 찾을 수 없습니다. dongCode=99999999"
                ));

        mockMvc.perform(get("/api/v1/market-reports/dongs/{dongCode}", "99999999"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.title").value("Not Found"))
                .andExpect(jsonPath("$.code").value("MARKET_DONG_NOT_FOUND"))
                .andExpect(jsonPath("$.detail").value("행정동을 찾을 수 없습니다. dongCode=99999999"))
                .andExpect(jsonPath("$.instance").value("/api/v1/market-reports/dongs/99999999"))
                .andExpect(jsonPath("$.timestamp").exists());
    }

    @Test
    void 예기치_못한_예외는_500_ProblemDetail로_변환하고_내부메시지를_노출하지_않는다() throws Exception {
        given(marketReportQueryService.getReport(any(), any()))
                .willThrow(new IllegalStateException("internal db failure detail"));

        mockMvc.perform(get("/api/v1/market-reports/dongs/{dongCode}", "11680511"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("MARKET_INTERNAL_ERROR"))
                .andExpect(jsonPath("$.detail").value("서버 내부 오류가 발생했습니다."));
    }

    @Test
    void 미리보기_조회_성공시_랭킹을_ApiResponse_래퍼로_응답한다() throws Exception {
        given(marketReportQueryService.getPreview(any(), any())).willReturn(samplePreview());

        mockMvc.perform(get("/api/v1/market-reports/dongs/{dongCode}/preview", "11680511"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("성공"))
                .andExpect(jsonPath("$.data.industryRankings[0].rank").value(1))
                .andExpect(jsonPath("$.data.industryRankings[0].industryCode").value("CS100"));
    }

    @Test
    void 미리보기에서_데이터가_없으면_404_ProblemDetail을_반환한다() throws Exception {
        given(marketReportQueryService.getPreview(any(), any()))
                .willThrow(new MarketResourceNotFoundException(
                        "MARKET_REPORT_NOT_FOUND",
                        "해당 행정동의 상권상세 데이터가 없습니다. dongCode=11680511"
                ));

        mockMvc.perform(get("/api/v1/market-reports/dongs/{dongCode}/preview", "11680511"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("MARKET_REPORT_NOT_FOUND"))
                .andExpect(jsonPath("$.instance").value("/api/v1/market-reports/dongs/11680511/preview"));
    }

    private MarketReportPreviewResponse samplePreview() {
        return new MarketReportPreviewResponse(List.of(
                new MarketReportResponse.SalesRankingItem(
                        1, "CS100", "한식음식점", 300L, 50L, new BigDecimal("50.00"), 10L, 30L
                )
        ));
    }

    private MarketReportResponse sampleReport() {
        return new MarketReportResponse(
                new MarketReportResponse.DongSummary(
                        "11680511",
                        "개포3동",
                        "11680",
                        "강남구",
                        new BigDecimal("37.4900"),
                        new BigDecimal("127.0600")
                ),
                new MarketReportResponse.PeriodSummary("20241", "20241", 2024, 1),
                null,
                null,
                null,
                null,
                null,
                null
        );
    }
}
