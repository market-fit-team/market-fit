package com.marketfit.post.infrastructure.crawling;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class JdkHttpContentCrawlerTest {

    @Test
    void UserAgent와_timeout을_적용하고_HTML을_추출한다() throws Exception {
        HttpClient httpClient = org.mockito.Mockito.mock(HttpClient.class);
        @SuppressWarnings("unchecked")
        HttpResponse<String> response = org.mockito.Mockito.mock(HttpResponse.class);
        URI uri = URI.create("https://93.184.216.34/article");
        doReturn(200).when(response).statusCode();
        doReturn(uri).when(response).uri();
        doReturn("""
                <html>
                  <head>
                    <title>기사 제목</title>
                    <meta name="description" content="기사 설명">
                  </head>
                  <body><article><p>기사 본문</p></article></body>
                </html>
                """).when(response).body();
        doReturn(response).when(httpClient).send(
                any(HttpRequest.class),
                any(HttpResponse.BodyHandler.class)
        );
        JdkHttpContentCrawler crawler = new JdkHttpContentCrawler(
                httpClient,
                new HtmlContentExtractor(),
                Duration.ofSeconds(7)
        );

        var result = crawler.crawl(uri.toString());

        assertThat(result.title()).isEqualTo("기사 제목");
        assertThat(result.metaDescription()).isEqualTo("기사 설명");
        assertThat(result.rawContent()).isEqualTo("기사 본문");
        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        org.mockito.Mockito.verify(httpClient).send(
                request.capture(),
                any(HttpResponse.BodyHandler.class)
        );
        assertThat(request.getValue().headers().firstValue("User-Agent"))
                .contains("MarketFitPostCrawler/1.0");
        assertThat(request.getValue().timeout()).contains(Duration.ofSeconds(7));
    }
}
