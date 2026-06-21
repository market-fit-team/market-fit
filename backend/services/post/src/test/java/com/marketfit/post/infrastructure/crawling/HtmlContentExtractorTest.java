package com.marketfit.post.infrastructure.crawling;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HtmlContentExtractorTest {

    private final HtmlContentExtractor extractor = new HtmlContentExtractor();

    @Test
    void article을_본문으로_우선_추출한다() {
        String html = """
                <html>
                  <head>
                    <title>기사 제목</title>
                    <meta name="description" content="기사 메타 설명">
                    <style>.hidden {display:none}</style>
                  </head>
                  <body>
                    <nav>메뉴 텍스트</nav>
                    <main>
                      <article>
                        <h1>창업 트렌드</h1>
                        <p>실제 기사 본문입니다.</p>
                        <script>dangerous()</script>
                      </article>
                    </main>
                    <footer>푸터 텍스트</footer>
                  </body>
                </html>
                """;

        var result = extractor.extract(html, "https://example.com/article");

        assertThat(result.title()).isEqualTo("기사 제목");
        assertThat(result.metaDescription()).isEqualTo("기사 메타 설명");
        assertThat(result.content())
                .contains("창업 트렌드", "실제 기사 본문입니다.")
                .doesNotContain("메뉴 텍스트", "푸터 텍스트", "dangerous");
    }
}
