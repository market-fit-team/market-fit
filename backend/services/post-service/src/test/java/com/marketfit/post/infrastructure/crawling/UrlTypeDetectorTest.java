package com.marketfit.post.infrastructure.crawling;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.marketfit.post.core.crawling.InputUrlType;

class UrlTypeDetectorTest {

    private final UrlTypeDetector detector = new UrlTypeDetector();

    @Test
    void 검색_URL과_기사_HTML과_불명확한_페이지를_구분한다() {
        assertThat(detector.detect(
                "https://news.example.com/search?query=프랜차이즈&page=1",
                "<html><body></body></html>"
        )).isEqualTo(InputUrlType.SEARCH_RESULT);

        assertThat(detector.detect(
                "https://news.example.com/article/1",
                "<html><head><meta property=\"og:type\" content=\"article\"></head>"
                        + "<body><article>기사 본문</article></body></html>"
        )).isEqualTo(InputUrlType.ARTICLE);

        assertThat(detector.detect(
                "https://news.example.com/about",
                "<html><body>짧은 페이지</body></html>"
        )).isEqualTo(InputUrlType.UNKNOWN);
    }
}
