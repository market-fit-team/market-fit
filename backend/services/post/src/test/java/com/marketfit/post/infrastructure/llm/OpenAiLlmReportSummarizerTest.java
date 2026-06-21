package com.marketfit.post.infrastructure.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.llm.LlmReportRequest;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.infrastructure.config.PostLlmProperties;

class OpenAiLlmReportSummarizerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void Responses_API의_structured_output을_리포트로_변환한다() throws Exception {
        HttpClient httpClient = org.mockito.Mockito.mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = org.mockito.Mockito.mock(HttpResponse.class);
        doReturn(200).when(response).statusCode();
        doReturn("""
                {
                  "output_text": "{\\"title\\":\\"AI 리포트\\",\\"summary\\":\\"핵심 요약\\",\\"content\\":\\"상세 본문\\"}",
                  "usage": {
                    "input_tokens": 100,
                    "output_tokens": 50,
                    "total_tokens": 150
                  }
                }
                """).when(response).body();
        doReturn(response).when(httpClient).send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        );
        PostLlmProperties properties = new PostLlmProperties(
                "OPENAI",
                "test-api-key",
                "gpt-4o-mini",
                30
        );
        OpenAiLlmReportSummarizer summarizer = new OpenAiLlmReportSummarizer(
                objectMapper,
                properties,
                httpClient
        );

        var result = summarizer.summarize(new LlmReportRequest(
                new CrawledDocument(
                        "https://example.com/article",
                        "원문 제목",
                        "원문 설명",
                        "수집된 기사 본문",
                        Instant.now()
                ),
                PostCategory.TREND
        ), "한국어 보고서 prompt");

        assertThat(result.title()).isEqualTo("AI 리포트");
        assertThat(result.provider()).isEqualTo("OPENAI");
        assertThat(result.model()).isEqualTo("gpt-4o-mini");
        assertThat(result.tokenUsage()).containsEntry("totalTokens", 150);
        ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
        org.mockito.Mockito.verify(httpClient).send(
                requestCaptor.capture(),
                any(HttpResponse.BodyHandler.class)
        );
        assertThat(requestCaptor.getValue().uri().toString())
                .isEqualTo("https://api.openai.com/v1/responses");
        assertThat(requestCaptor.getValue().headers().firstValue("Authorization"))
                .contains("Bearer test-api-key");
    }

    @Test
    void 직접_생성된_OpenAI_adapter에_API_KEY가_없으면_503을_반환한다() {
        OpenAiLlmReportSummarizer summarizer = new OpenAiLlmReportSummarizer(
                objectMapper,
                new PostLlmProperties("OPENAI", "", "gpt-4o-mini", 30),
                org.mockito.Mockito.mock(HttpClient.class)
        );

        assertThatThrownBy(() -> summarizer.summarize(new LlmReportRequest(
                new CrawledDocument(null, null, null, "본문", Instant.now()),
                null
        ), "prompt"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(
                        ((ResponseStatusException) exception).getStatusCode()
                ).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    void JSON_파싱이_실패하면_plain_text를_content로_사용한다() throws Exception {
        HttpClient httpClient = org.mockito.Mockito.mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = org.mockito.Mockito.mock(HttpResponse.class);
        doReturn(200).when(response).statusCode();
        doReturn("""
                {
                  "output_text": "# 일반 텍스트 보고서\\n\\n요약 내용입니다."
                }
                """).when(response).body();
        doReturn(response).when(httpClient).send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        );
        OpenAiLlmReportSummarizer summarizer = new OpenAiLlmReportSummarizer(
                objectMapper,
                new PostLlmProperties("OPENAI", "test-api-key", "gpt-4o-mini", 30),
                httpClient
        );

        var result = summarizer.summarize(
                new LlmReportRequest(
                        new CrawledDocument(null, null, null, "본문", Instant.now()),
                        null
                ),
                "prompt"
        );

        assertThat(result.content()).contains("일반 텍스트 보고서");
        assertThat(result.summary()).startsWith("# 일반 텍스트 보고서");
    }
}
