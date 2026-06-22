package com.marketfit.post.application.crawling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.core.crawling.ContentCrawler;
import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.crawling.FetchedPage;
import com.marketfit.post.core.crawling.InputUrlType;
import com.marketfit.post.core.crawling.PostCrawlSource;
import com.marketfit.post.core.post.PostVisibility;
import com.marketfit.post.infrastructure.config.PostCrawlingProperties;
import com.marketfit.post.infrastructure.crawling.ArticleLinkExtractor;
import com.marketfit.post.infrastructure.crawling.CommerceParagraphFilter;
import com.marketfit.post.infrastructure.crawling.UrlTypeDetector;
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
                sourceStore,
                new PostCrawlingProperties(null, 10, 0, 12_000),
                new UrlTypeDetector(),
                new ArticleLinkExtractor(),
                new CommerceParagraphFilter()
        );
        when(source.getId()).thenReturn(sourceId);
        when(sourceStore.createRequested(any(), any(), any())).thenReturn(source);
    }

    @Test
    void rawContent가_있으면_네트워크_크롤링을_호출하지_않는다() {
        var result = service.crawl(new CrawlSummaryRequest(
                "https://example.com/article",
                "프랜차이즈 창업",
                " 상가 창업과 프랜차이즈 운영을 설명하는 직접 입력한 원문 ",
                PostVisibility.PUBLIC
        ));

        verify(crawler, never()).crawl(any());
        verify(sourceStore).markCrawled(any(com.marketfit.post.core.crawling.CrawledContent.class));
        assertThat(result.bodyText()).contains("상가 창업", "프랜차이즈");
    }

    @Test
    void URL이_있으면_해당_URL을_크롤링한다() {
        when(crawler.crawl("https://example.com/article"))
                .thenReturn(new CrawledDocument(
                        "https://example.com/article",
                        "기사 제목",
                        "기사 설명",
                        "창업 상권 관련 기사 본문",
                        Instant.parse("2026-06-21T00:00:00Z")
                ));

        var result = service.crawl(new CrawlSummaryRequest(
                "https://example.com/article",
                "프랜차이즈 창업",
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

    @Test
    void 요청_URL과_원문이_없으면_설정된_기본_URL을_크롤링한다() {
        service = new PostCrawlService(
                crawler,
                sourceStore,
                new PostCrawlingProperties("https://example.com/default", 10, 0, 12_000),
                new UrlTypeDetector(),
                new ArticleLinkExtractor(),
                new CommerceParagraphFilter()
        );
        when(source.getId()).thenReturn(sourceId);
        when(sourceStore.createRequested(any(), any(), any())).thenReturn(source);
        when(crawler.crawl("https://example.com/default"))
                .thenReturn(new CrawledDocument(
                        "https://example.com/default",
                        "기본 기사",
                        "기본 설명",
                        "프랜차이즈 창업과 상권을 설명하는 기본 기사 본문입니다.",
                        Instant.parse("2026-06-21T00:00:00Z")
                ));

        var result = service.crawl(new CrawlSummaryRequest(
                null,
                null,
                null,
                PostVisibility.PUBLIC
        ));

        verify(crawler).crawl("https://example.com/default");
        assertThat(result.sourceUrl()).isEqualTo("https://example.com/default");
    }

    @Test
    void preview는_검색_결과의_여러_기사_중_성공한_본문만_합치고_DB에_저장하지_않는다() {
        String searchUrl = "https://news.example.com/search?query=프랜차이즈&page=1";
        when(crawler.fetch(searchUrl)).thenReturn(new FetchedPage(
                searchUrl,
                """
                        <html><body>
                          <a href="/article/1">프랜차이즈 창업 경제 뉴스 기사입니다</a>
                          <a href="/article/2">가맹점 상권 산업 뉴스 기사입니다</a>
                          <a href="/article/3">외식 프랜차이즈 창업 기사입니다</a>
                        </body></html>
                        """,
                Instant.now()
        ));
        when(crawler.crawl("https://news.example.com/article/1"))
                .thenReturn(article("https://news.example.com/article/1", "프랜차이즈 창업"));
        when(crawler.crawl("https://news.example.com/article/2"))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "기사 실패"));
        when(crawler.crawl("https://news.example.com/article/3"))
                .thenReturn(article("https://news.example.com/article/3", "외식 프랜차이즈"));

        var result = service.preview(new CrawlSummaryRequest(
                searchUrl,
                "프랜차이즈 창업",
                null,
                PostVisibility.PUBLIC
        ));

        assertThat(result.inputUrlType()).isEqualTo(InputUrlType.SEARCH_RESULT);
        assertThat(result.discoveredArticleUrls()).hasSize(3);
        assertThat(result.crawledArticleCount()).isEqualTo(2);
        assertThat(result.skippedArticleCount()).isEqualTo(1);
        assertThat(result.bodyText()).contains("[기사 1]", "[기사 2]");
        verify(sourceStore, never()).createRequested(any(), any(), any());
        verify(sourceStore, never()).markCrawled(any(com.marketfit.post.core.crawling.CrawledContent.class));
    }

    @Test
    void 검색_결과의_모든_기사가_실패하면_422를_반환한다() {
        String searchUrl = "https://news.example.com/search?query=프랜차이즈";
        when(crawler.fetch(searchUrl)).thenReturn(new FetchedPage(
                searchUrl,
                "<a href=\"/article/1\">프랜차이즈 창업 뉴스 기사입니다</a>",
                Instant.now()
        ));
        when(crawler.crawl("https://news.example.com/article/1"))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "기사 실패"));

        assertThatThrownBy(() -> service.preview(new CrawlSummaryRequest(
                searchUrl,
                "프랜차이즈",
                null,
                PostVisibility.PUBLIC
        )))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(exception -> assertThat(
                        ((ResponseStatusException) exception).getStatusCode()
                ).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY));
    }

    private CrawledDocument article(String url, String keyword) {
        return new CrawledDocument(
                url,
                keyword + " 리포트",
                "상권과 가맹점 관련 설명",
                keyword + " 리포트",
                "상권과 임대료 변화",
                "article",
                List.of(
                        "기사 배경을 설명하기 위한 충분히 긴 문장입니다.",
                        keyword + " 시장과 가맹점 상권을 설명하는 충분히 긴 핵심 문장입니다.",
                        "운영 위험과 임대료를 검토해야 한다는 충분히 긴 문장입니다."
                ),
                keyword + " 기사 본문",
                Instant.now()
        );
    }
}
