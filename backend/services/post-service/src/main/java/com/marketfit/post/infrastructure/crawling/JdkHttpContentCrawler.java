package com.marketfit.post.infrastructure.crawling;

import java.net.InetAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.core.crawling.ContentCrawler;
import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.crawling.FetchedPage;
import com.marketfit.post.infrastructure.config.PostCrawlingProperties;
import org.springframework.beans.factory.annotation.Autowired;

@Component
public class JdkHttpContentCrawler implements ContentCrawler {

    private final HttpClient httpClient;
    private final HtmlContentExtractor contentExtractor;
    private final Duration requestTimeout;

    @Autowired
    public JdkHttpContentCrawler(
            HtmlContentExtractor contentExtractor,
            PostCrawlingProperties properties
    ) {
        this(
                HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(Math.min(properties.timeoutSeconds(), 5)))
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .build(),
                contentExtractor,
                Duration.ofSeconds(properties.timeoutSeconds())
        );
    }

    JdkHttpContentCrawler(
            HttpClient httpClient,
            HtmlContentExtractor contentExtractor,
            Duration requestTimeout
    ) {
        this.httpClient = httpClient;
        this.contentExtractor = contentExtractor;
        this.requestTimeout = requestTimeout;
    }

    @Override
    public FetchedPage fetch(String url) {
        URI uri = validateUri(url);
        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(requestTimeout)
                    .header("User-Agent", "MarketFitPostCrawler/1.0")
                    .header("Accept", "text/html,text/plain;q=0.9")
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "크롤링 대상이 성공 응답을 반환하지 않았습니다."
                );
            }
            URI finalUri = validateUri(response.uri().toString());
            return new FetchedPage(finalUri.toString(), response.body(), Instant.now());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "크롤링 요청이 중단되었습니다.", exception);
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "URL 콘텐츠를 수집하지 못했습니다.", exception);
        }
    }

    @Override
    public CrawledDocument crawl(String url) {
        FetchedPage page = fetch(url);
        try {
            var extracted = contentExtractor.extract(page.html(), page.url());
            if (extracted.content().isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "수집된 본문이 비어 있습니다.");
            }
            return new CrawledDocument(
                    page.url(),
                    extracted.title(),
                    extracted.metaDescription(),
                    extracted.ogTitle(),
                    extracted.ogDescription(),
                    extracted.usedSelector(),
                    extracted.paragraphs(),
                    extracted.content(),
                    page.collectedAt()
            );
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "HTML 본문을 추출하지 못했습니다.", exception);
        }
    }

    private URI validateUri(String url) {
        try {
            URI uri = URI.create(url.trim());
            if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
                throw new IllegalArgumentException("unsupported scheme");
            }
            if (uri.getHost() == null) {
                throw new IllegalArgumentException("host is required");
            }
            for (InetAddress address : InetAddress.getAllByName(uri.getHost())) {
                if (address.isAnyLocalAddress()
                        || address.isLoopbackAddress()
                        || address.isLinkLocalAddress()
                        || address.isSiteLocalAddress()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내부 네트워크 URL은 수집할 수 없습니다.");
                }
            }
            return uri;
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유효한 http 또는 https URL이 필요합니다.");
        }
    }

}
