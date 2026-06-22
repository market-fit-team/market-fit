package com.marketfit.post.application.crawling;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.core.crawling.ArticleCrawlResult;
import com.marketfit.post.core.crawling.ContentCrawler;
import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.crawling.InputUrlType;
import com.marketfit.post.core.crawling.PostCrawlSource;
import com.marketfit.post.infrastructure.config.PostCrawlingProperties;
import com.marketfit.post.infrastructure.crawling.ArticleLinkExtractor;
import com.marketfit.post.infrastructure.crawling.CommerceParagraphFilter;
import com.marketfit.post.infrastructure.crawling.UrlTypeDetector;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostCrawlService {

    private static final int MAX_ERROR_MESSAGE_LENGTH = 1_000;
    private static final int MAX_ARTICLES = 5;

    private final ContentCrawler contentCrawler;
    private final PostCrawlSourceStore sourceStore;
    private final PostCrawlingProperties properties;
    private final UrlTypeDetector urlTypeDetector;
    private final ArticleLinkExtractor articleLinkExtractor;
    private final CommerceParagraphFilter paragraphFilter;

    public CrawledContent preview(CrawlSummaryRequest request) {
        return analyze(request);
    }

    public CrawledContent crawl(CrawlSummaryRequest request) {
        String rawContent = normalize(request.rawContent());
        String requestUrl = resolveUrl(request.url(), rawContent);
        if (!hasText(rawContent) && !hasText(requestUrl)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "url, rawContent 또는 POST_CRAWL_DEFAULT_URL 중 하나가 필요합니다."
            );
        }
        PostCrawlSource source = sourceStore.createRequested(
                requestUrl,
                normalize(request.keyword()),
                rawContent
        );
        try {
            CrawledContent analyzed = analyze(request);
            CrawledContent persisted = withSourceId(analyzed, source.getId());
            sourceStore.markCrawled(persisted);
            return persisted;
        } catch (RuntimeException exception) {
            saveFailure(source, exception);
            throw exception;
        }
    }

    public void linkPost(CrawledContent content, UUID postId) {
        sourceStore.linkPost(content.sourceId(), postId);
    }

    private CrawledContent analyze(CrawlSummaryRequest request) {
        String rawContent = normalize(request.rawContent());
        String keyword = normalize(request.keyword());
        String requestUrl = resolveUrl(request.url(), rawContent);
        if (!hasText(rawContent) && !hasText(requestUrl)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "url, rawContent 또는 POST_CRAWL_DEFAULT_URL 중 하나가 필요합니다."
            );
        }
        if (hasText(rawContent)) {
            return analyzeRawContent(requestUrl, keyword, rawContent);
        }

        var inputPage = contentCrawler.fetch(requestUrl);
        if (inputPage == null) {
            CrawledDocument document = contentCrawler.crawl(requestUrl);
            return combine(
                    requestUrl,
                    keyword,
                    InputUrlType.ARTICLE,
                    List.of(document.sourceUrl()),
                    List.of(toArticleResult(document, keyword))
            );
        }
        InputUrlType type = urlTypeDetector.detect(inputPage.url(), inputPage.html());
        if (type == InputUrlType.SEARCH_RESULT) {
            var candidates = articleLinkExtractor.extract(inputPage.url(), inputPage.html(), MAX_ARTICLES);
            if (candidates.isEmpty()) {
                throw noRelevantContent();
            }
            List<ArticleCrawlResult> articles = new ArrayList<>();
            for (int index = 0; index < candidates.size(); index++) {
                if (index > 0) {
                    delay();
                }
                String articleUrl = candidates.get(index).url();
                try {
                    articles.add(toArticleResult(contentCrawler.crawl(articleUrl), keyword));
                } catch (RuntimeException exception) {
                    articles.add(failedArticle(articleUrl, exception));
                }
            }
            return combine(inputPage.url(), keyword, type, candidates.stream().map(candidate -> candidate.url()).toList(), articles);
        }

        CrawledDocument document = contentCrawler.crawl(inputPage.url());
        return combine(
                inputPage.url(),
                keyword,
                type,
                List.of(document.sourceUrl()),
                List.of(toArticleResult(document, keyword))
        );
    }

    private CrawledContent analyzeRawContent(String requestUrl, String keyword, String rawContent) {
        if (!paragraphFilter.hasInterestKeyword(rawContent, keyword)) {
            throw noRelevantContent();
        }
        List<String> paragraphs = splitRawContent(rawContent);
        CrawledDocument document = new CrawledDocument(
                requestUrl,
                keyword,
                null,
                null,
                null,
                "rawContent",
                paragraphs,
                rawContent,
                Instant.now()
        );
        return combine(
                requestUrl,
                keyword,
                InputUrlType.RAW_CONTENT,
                List.of(),
                List.of(toArticleResult(document, keyword))
        );
    }

    private ArticleCrawlResult toArticleResult(CrawledDocument document, String keyword) {
        var filtered = paragraphFilter.filter(document, keyword);
        if (filtered.paragraphs().isEmpty()) {
            return new ArticleCrawlResult(
                    document.sourceUrl(), document.title(), document.metaDescription(),
                    document.ogTitle(), document.ogDescription(), document.usedSelector(),
                    document.paragraphs(), document.rawContent().length(), "SKIPPED",
                    CommerceParagraphFilter.NO_RELEVANT_CONTENT, filtered.matchedKeywords(),
                    List.of(), filtered.excludedKeywords()
            );
        }
        return new ArticleCrawlResult(
                document.sourceUrl(), document.title(), document.metaDescription(),
                document.ogTitle(), document.ogDescription(), document.usedSelector(),
                document.paragraphs(), document.rawContent().length(), "CRAWLED", null,
                filtered.matchedKeywords(), filtered.paragraphs(), filtered.excludedKeywords()
        );
    }

    private ArticleCrawlResult failedArticle(String url, RuntimeException exception) {
        return new ArticleCrawlResult(
                url, null, null, null, null, "none", List.of(), 0, "FAILED",
                safeErrorMessage(exception), List.of(), List.of(), List.of()
        );
    }

    private CrawledContent combine(
            String inputUrl,
            String keyword,
            InputUrlType type,
            List<String> discoveredUrls,
            List<ArticleCrawlResult> articles
    ) {
        List<ArticleCrawlResult> succeeded = articles.stream().filter(ArticleCrawlResult::succeeded).toList();
        if (succeeded.isEmpty()) {
            throw noRelevantContent();
        }
        var allKeywords = new LinkedHashSet<String>();
        var allExcluded = new LinkedHashSet<String>();
        var globalParagraphs = new LinkedHashSet<String>();
        int totalParagraphs = articles.stream().mapToInt(article -> article.paragraphs().size()).sum();
        int matchedParagraphs = succeeded.stream().mapToInt(article -> article.matchedParagraphs().size()).sum();
        succeeded.forEach(article -> {
            allKeywords.addAll(article.matchedKeywords());
            allExcluded.addAll(article.excludedKeywords());
        });
        int perArticleLimit = Math.max(1_000, properties.maxInputCharacters() / succeeded.size());
        StringBuilder combined = new StringBuilder();
        for (int index = 0; index < succeeded.size(); index++) {
            ArticleCrawlResult article = succeeded.get(index);
            StringBuilder section = new StringBuilder("""
                    [기사 %d]
                    제목: %s
                    URL: %s
                    관련 키워드: %s
                    본문:
                    """.formatted(
                    index + 1,
                    hasText(article.title()) ? article.title() : "(제목 없음)",
                    hasText(article.url()) ? article.url() : "(직접 입력)",
                    String.join(", ", article.matchedKeywords())
            ));
            for (String paragraph : article.matchedParagraphs()) {
                if (!globalParagraphs.add(paragraph)) {
                    continue;
                }
                if (section.length() + paragraph.length() + 1 > perArticleLimit) {
                    break;
                }
                section.append(paragraph).append('\n');
            }
            if (combined.length() + section.length() > properties.maxInputCharacters()) {
                break;
            }
            combined.append(section).append('\n');
        }
        if (combined.isEmpty()) {
            throw noRelevantContent();
        }
        double relevance = totalParagraphs == 0
                ? 0
                : Math.min(1.0, matchedParagraphs / (double) totalParagraphs
                        + Math.min(0.25, allKeywords.size() * 0.03)
                        - Math.min(0.2, allExcluded.size() * 0.03));
        ArticleCrawlResult first = succeeded.getFirst();
        return new CrawledContent(
                null,
                inputUrl,
                keyword,
                first.title(),
                first.metaDescription(),
                combined.toString().trim(),
                Instant.now(),
                type,
                discoveredUrls,
                succeeded.size(),
                articles.size() - succeeded.size(),
                totalParagraphs,
                matchedParagraphs,
                List.copyOf(allKeywords),
                List.copyOf(allExcluded),
                Math.max(0, relevance),
                first.usedSelector()
        );
    }

    private CrawledContent withSourceId(CrawledContent content, UUID sourceId) {
        return new CrawledContent(
                sourceId, content.sourceUrl(), content.keyword(), content.title(),
                content.metaDescription(), content.bodyText(), content.crawledAt(),
                content.inputUrlType(), content.discoveredArticleUrls(),
                content.crawledArticleCount(), content.skippedArticleCount(),
                content.totalParagraphCount(), content.matchedParagraphCount(),
                content.matchedKeywords(), content.excludedKeywords(),
                content.relevanceScore(), content.usedSelector()
        );
    }

    private List<String> splitRawContent(String rawContent) {
        return List.of(rawContent.split("(?<=[.!?。])\\s+|\\R+")).stream()
                .map(String::trim)
                .filter(value -> value.length() >= 20)
                .toList();
    }

    private String resolveUrl(String requestedUrl, String rawContent) {
        String requestUrl = normalize(requestedUrl);
        if (!hasText(rawContent) && !hasText(requestUrl)) {
            return normalize(properties.defaultUrl());
        }
        return requestUrl;
    }

    private void delay() {
        if (properties.articleDelayMillis() <= 0) {
            return;
        }
        try {
            Thread.sleep(properties.articleDelayMillis());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "기사 크롤링 대기 중 요청이 중단되었습니다.");
        }
    }

    private ResponseStatusException noRelevantContent() {
        return new ResponseStatusException(
                HttpStatus.UNPROCESSABLE_ENTITY,
                CommerceParagraphFilter.NO_RELEVANT_CONTENT
        );
    }

    private void saveFailure(PostCrawlSource source, RuntimeException exception) {
        try {
            sourceStore.markFailed(source.getId(), safeErrorMessage(exception));
        } catch (RuntimeException persistenceException) {
            exception.addSuppressed(persistenceException);
        }
    }

    private String safeErrorMessage(RuntimeException exception) {
        String message = exception instanceof ResponseStatusException responseException
                ? responseException.getReason()
                : exception.getMessage();
        String safeMessage = hasText(message) ? message.trim() : "크롤링 처리에 실패했습니다.";
        return safeMessage.length() <= MAX_ERROR_MESSAGE_LENGTH
                ? safeMessage
                : safeMessage.substring(0, MAX_ERROR_MESSAGE_LENGTH);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
