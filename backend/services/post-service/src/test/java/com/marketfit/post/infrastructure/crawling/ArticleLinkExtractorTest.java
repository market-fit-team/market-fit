package com.marketfit.post.infrastructure.crawling;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ArticleLinkExtractorTest {

    private final ArticleLinkExtractor extractor = new ArticleLinkExtractor();

    @Test
    void 같은_도메인의_기사만_중복_제거하고_최대_5개를_점수순으로_반환한다() {
        String html = """
                <html><body>
                  <a href="/article/1">프랜차이즈 창업 시장 주요 뉴스 분석</a>
                  <a href="/article/1#share">프랜차이즈 창업 시장 주요 뉴스 분석</a>
                  <a href="/news/2">상권과 가맹점 관련 경제 뉴스</a>
                  <a href="/article/3">소상공인 매장 창업 기사</a>
                  <a href="/article/4">외식 프랜차이즈 산업 기사</a>
                  <a href="/article/5">카페 점포 경제 기사</a>
                  <a href="/article/6">자영업 상가 기사</a>
                  <a href="/login">로그인</a>
                  <a href="https://other.example.com/article/7">외부 기사</a>
                  <a href="javascript:void(0)">공유</a>
                </body></html>
                """;

        var candidates = extractor.extract(
                "https://news.example.com/search?query=창업",
                html,
                5
        );

        assertThat(candidates).hasSize(5);
        assertThat(candidates)
                .extracting(candidate -> candidate.url())
                .allMatch(url -> url.startsWith("https://news.example.com/"))
                .doesNotHaveDuplicates()
                .doesNotContain("https://news.example.com/login");
        assertThat(candidates.getFirst().score())
                .isGreaterThanOrEqualTo(candidates.getLast().score());
    }
}
