package com.marketfit.post.application.llm;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.llm.LlmReportRequest;
import com.marketfit.post.core.llm.LlmSummaryResult;
import com.marketfit.post.core.llm.PostLlmProvider;
import com.marketfit.post.core.llm.PostLlmSummary;
import com.marketfit.post.infrastructure.config.PostLlmProperties;

class PostLlmSummaryServiceTest {

    private final PostLlmProvider provider = org.mockito.Mockito.mock(PostLlmProvider.class);
    private final PostLlmSummaryStore store = org.mockito.Mockito.mock(PostLlmSummaryStore.class);
    private final PostLlmSummary record = org.mockito.Mockito.mock(PostLlmSummary.class);
    private final UUID summaryId = UUID.randomUUID();
    private PostLlmSummaryService service;

    @BeforeEach
    void setUp() {
        service = new PostLlmSummaryService(
                provider,
                store,
                new PostLlmProperties("OPENAI", "key", "gpt-4o-mini", 30)
        );
        when(record.getId()).thenReturn(summaryId);
        when(store.createRequested(anyString(), anyString(), anyString())).thenReturn(record);
    }

    @Test
    void 성공하면_REQUESTED를_SUMMARIZED로_갱신한다() {
        LlmReportRequest request = request();
        LlmSummaryResult result = new LlmSummaryResult(
                "제목",
                "두 문장 요약입니다. 두 번째 문장입니다.",
                "# 제목\n\n## 핵심 요약\n- 하나\n- 둘\n- 셋",
                "OPENAI",
                "gpt-4o-mini",
                Map.of("totalTokens", 120)
        );
        when(provider.summarize(org.mockito.ArgumentMatchers.eq(request), anyString()))
                .thenReturn(result);

        var execution = service.summarize(request);

        assertThat(execution.result()).isEqualTo(result);
        verify(store).createRequested(
                org.mockito.ArgumentMatchers.eq("OPENAI"),
                org.mockito.ArgumentMatchers.eq("gpt-4o-mini"),
                org.mockito.ArgumentMatchers.contains("title은 30자 이내")
        );
        verify(store).markSummarized(summaryId, result);
    }

    @Test
    void Provider_실패는_FAILED로_저장하고_일관된_오류를_유지한다() {
        LlmReportRequest request = request();
        ResponseStatusException failure = new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "OpenAI API가 성공 응답을 반환하지 않았습니다."
        );
        when(provider.summarize(org.mockito.ArgumentMatchers.eq(request), anyString()))
                .thenThrow(failure);

        assertThatThrownBy(() -> service.summarize(request)).isSameAs(failure);

        verify(store).markFailed(
                summaryId,
                "OpenAI API가 성공 응답을 반환하지 않았습니다."
        );
    }

    private LlmReportRequest request() {
        return new LlmReportRequest(
                new CrawledDocument(
                        "https://example.com",
                        "원문 제목",
                        "원문 설명",
                        "원문 본문",
                        Instant.now()
                ),
                null
        );
    }
}
