package com.marketfit.post.application.crawling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.core.crawling.ContentCrawler;
import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.crawling.PostCrawlSource;
import com.marketfit.post.core.post.PostVisibility;
class PostCrawlServiceTest {

    private final ContentCrawler crawler = org.mockito.Mockito.mock(ContentCrawler.class);
    private final PostCrawlSourceStore sourceStore = org.mockito.Mockito.mock(PostCrawlSourceStore.class);
    private final PostCrawlSource source = org.mockito.Mockito.mock(PostCrawlSource.class);
    private final UUID sourceId = UUID.randomUUID();
    private PostCrawlService service;

    @BeforeEach
    void setUp() {
        service = new PostCrawlService(
                crawler,
                sourceStore
        );
        when(source.getId()).thenReturn(sourceId);
        when(sourceStore.createRequested(any(), any(), any())).thenReturn(source);
    }

    @Test
    void rawContent가_있으면_네트워크_크롤링을_호출하지_않는다() {
        var result = service.crawl(new CrawlSummaryRequest(
                "https://example.com/article",
                "AI 채용",
                " 직접 입력한 원문 ",
                PostVisibility.PUBLIC
        ));

        verify(crawler, never()).crawl(any());
        verify(sourceStore).markCrawled(
                eq(sourceId),
                eq("https://example.com/article"),
                eq(null),
                eq("직접 입력한 원문"),
                any(Instant.class)
        );
        assertThat(result.bodyText()).isEqualTo("직접 입력한 원문");
    }

    @Test
    void URL이_있으면_해당_URL을_크롤링한다() {
        when(crawler.crawl("https://example.com/article"))
                .thenReturn(new CrawledDocument(
                        "https://example.com/article",
                        "기사 제목",
                        "기사 설명",
                        "기사 본문",
                        Instant.parse("2026-06-21T00:00:00Z")
                ));

        var result = service.crawl(new CrawlSummaryRequest(
                "https://example.com/article",
                "AI 채용",
                null,
                PostVisibility.PRIVATE
        ));

        verify(crawler).crawl("https://example.com/article");
        assertThat(result.title()).isEqualTo("기사 제목");
        assertThat(result.metaDescription()).isEqualTo("기사 설명");
    }

    @Test
    void 크롤링_실패를_FAILED로_저장하고_원래_오류를_반환한다() {
        ResponseStatusException failure = new ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "URL 콘텐츠를 수집하지 못했습니다."
        );
        when(crawler.crawl("https://example.com/article")).thenThrow(failure);

        assertThatThrownBy(() -> service.crawl(new CrawlSummaryRequest(
                "https://example.com/article",
                null,
                null,
                PostVisibility.PUBLIC
        ))).isSameAs(failure);

        verify(sourceStore).markFailed(sourceId, "URL 콘텐츠를 수집하지 못했습니다.");
    }

    @Test
    void 대상이_전혀_없으면_일관된_400을_반환한다() {
        assertThatThrownBy(() -> service.crawl(new CrawlSummaryRequest(
                null,
                null,
                null,
                PostVisibility.PUBLIC
        )))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(
                        ((ResponseStatusException) exception).getStatusCode()
                ).isEqualTo(HttpStatus.BAD_REQUEST));

        verify(sourceStore, never()).createRequested(any(), any(), any());
    }
}
