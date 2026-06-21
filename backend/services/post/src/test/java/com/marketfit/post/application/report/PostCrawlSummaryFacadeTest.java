package com.marketfit.post.application.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.application.crawling.PostCrawlService;
import com.marketfit.post.application.llm.PostLlmSummaryService;
import com.marketfit.post.application.post.PostService;
import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.llm.LlmSummaryResult;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostVisibility;

class PostCrawlSummaryFacadeTest {

    @Test
    void URL_요청은_PostCrawlService에_위임하고_LLM_Provider는_서비스_경계에서_대체된다() {
        PostCrawlService crawlService = org.mockito.Mockito.mock(PostCrawlService.class);
        PostLlmSummaryService summaryService = org.mockito.Mockito.mock(PostLlmSummaryService.class);
        PostService postService = org.mockito.Mockito.mock(PostService.class);
        PostCrawlSummaryFacade facade = new PostCrawlSummaryFacade(
                crawlService,
                summaryService,
                postService
        );
        CrawlSummaryRequest request = new CrawlSummaryRequest(
                "https://example.com/article",
                "AI 채용",
                null,
                PostVisibility.PUBLIC
        );
        CrawledContent crawled = crawledContent();
        LlmSummaryResult result = new LlmSummaryResult(
                "제목",
                "요약",
                "본문",
                "OPENAI",
                "gpt-4o-mini",
                Map.of()
        );
        PostLlmSummaryService.SummaryExecution execution =
                new PostLlmSummaryService.SummaryExecution(UUID.randomUUID(), result);
        Post saved = Post.create(
                "user-1",
                "user-1",
                new PostDraft(
                        result.title(),
                        result.summary(),
                        result.content(),
                        PostCategory.TREND,
                        1,
                        PostSourceType.LLM_REPORT,
                        crawled.sourceUrl(),
                        crawled.title(),
                        crawled.crawledAt(),
                        "OPENAI:gpt-4o-mini"
                )
        );
        saved.configureCrawlSource(crawled.sourceId(), PostVisibility.PUBLIC);
        when(crawlService.crawl(request)).thenReturn(crawled);
        when(summaryService.summarize(any())).thenReturn(execution);
        when(postService.createCrawlSummary(any(), any(), any(), any())).thenReturn(saved);

        facade.create("user-1", request);

        verify(crawlService).crawl(eq(request));
        verify(summaryService).summarize(any());
    }

    @Test
    void 크롤링_LLM_Post저장_메타데이터_연결을_순서대로_조합한다() {
        PostCrawlService crawlService = org.mockito.Mockito.mock(PostCrawlService.class);
        PostLlmSummaryService summaryService = org.mockito.Mockito.mock(PostLlmSummaryService.class);
        PostService postService = org.mockito.Mockito.mock(PostService.class);
        PostCrawlSummaryFacade facade = new PostCrawlSummaryFacade(
                crawlService,
                summaryService,
                postService
        );
        CrawlSummaryRequest request = new CrawlSummaryRequest(
                "https://example.com",
                "AI 채용",
                null,
                null
        );
        CrawledContent crawled = crawledContent();
        LlmSummaryResult result = new LlmSummaryResult(
                "AI 채용 트렌드 요약 리포트",
                "최근 AI 채용 수요가 증가하고 있습니다.",
                "# AI 채용 트렌드\n\n## 핵심 요약\n- 증가",
                "OPENAI",
                "gpt-4o-mini",
                Map.of("totalTokens", 120)
        );
        var execution = new PostLlmSummaryService.SummaryExecution(UUID.randomUUID(), result);
        Post saved = Post.create(
                "user-1",
                "user-1",
                new PostDraft(
                        result.title(),
                        result.summary(),
                        result.content(),
                        PostCategory.TREND,
                        2,
                        PostSourceType.LLM_REPORT,
                        crawled.sourceUrl(),
                        crawled.title(),
                        crawled.crawledAt(),
                        "OPENAI:gpt-4o-mini"
                )
        );
        saved.configureCrawlSource(crawled.sourceId(), PostVisibility.PUBLIC);
        when(crawlService.crawl(request)).thenReturn(crawled);
        when(summaryService.summarize(any())).thenReturn(execution);
        when(postService.createCrawlSummary(
                any(),
                any(),
                any(),
                any()
        )).thenReturn(saved);

        Post post = facade.create(" user-1 ", request);

        assertThat(post.getVisibility()).isEqualTo(PostVisibility.PUBLIC);
        assertThat(post.getSourceType()).isEqualTo(PostSourceType.LLM_REPORT);
        assertThat(post.getSourceId()).isEqualTo(crawled.sourceId());
        verify(crawlService).linkPost(crawled, saved.getId());
        verify(summaryService).linkPost(execution, saved.getId());
    }

    @Test
    void Post_DB_저장_실패는_LLM_실패와_구분된_500을_반환한다() {
        PostCrawlService crawlService = org.mockito.Mockito.mock(PostCrawlService.class);
        PostLlmSummaryService summaryService = org.mockito.Mockito.mock(PostLlmSummaryService.class);
        PostService postService = org.mockito.Mockito.mock(PostService.class);
        PostCrawlSummaryFacade facade = new PostCrawlSummaryFacade(
                crawlService,
                summaryService,
                postService
        );
        CrawlSummaryRequest request = new CrawlSummaryRequest(
                null,
                null,
                "원문",
                PostVisibility.PUBLIC
        );
        when(crawlService.crawl(request)).thenReturn(crawledContent());
        when(summaryService.summarize(any())).thenReturn(
                new PostLlmSummaryService.SummaryExecution(
                        UUID.randomUUID(),
                        new LlmSummaryResult(
                                "제목",
                                "요약",
                                "본문",
                                "OPENAI",
                                "gpt-4o-mini",
                                Map.of()
                        )
                )
        );
        when(postService.createCrawlSummary(any(), any(), any(), any()))
                .thenThrow(new DataIntegrityViolationException("db failure"));

        assertThatThrownBy(() -> facade.create("user-1", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> {
                    ResponseStatusException response = (ResponseStatusException) exception;
                    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
                    assertThat(response.getReason()).contains("Post 저장에 실패");
                });
    }

    private CrawledContent crawledContent() {
        return new CrawledContent(
                UUID.randomUUID(),
                "https://example.com",
                "AI 채용",
                "기사 제목",
                "기사 설명",
                "기사 본문",
                Instant.parse("2026-06-21T01:00:00Z")
        );
    }
}
