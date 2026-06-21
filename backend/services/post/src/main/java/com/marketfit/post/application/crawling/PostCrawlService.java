package com.marketfit.post.application.crawling;

import java.time.Instant;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.core.crawling.ContentCrawler;
import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.crawling.PostCrawlSource;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostCrawlService {

    private static final int MAX_ERROR_MESSAGE_LENGTH = 1_000;

    private final ContentCrawler contentCrawler;
    private final PostCrawlSourceStore sourceStore;

    public CrawledContent crawl(CrawlSummaryRequest request) {
        String rawContent = normalize(request.rawContent());
        String requestUrl = normalize(request.url());

        if (!hasText(rawContent) && !hasText(requestUrl)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "url 또는 rawContent 중 하나가 필요합니다."
            );
        }

        PostCrawlSource source = sourceStore.createRequested(
                requestUrl,
                normalize(request.keyword()),
                rawContent
        );

        try {
            if (hasText(rawContent)) {
                Instant crawledAt = Instant.now();
                sourceStore.markCrawled(
                        source.getId(),
                        requestUrl,
                        null,
                        rawContent,
                        crawledAt
                );
                return new CrawledContent(
                        source.getId(),
                        requestUrl,
                        normalize(request.keyword()),
                        null,
                        null,
                        rawContent,
                        crawledAt
                );
            }

            CrawledDocument document = contentCrawler.crawl(requestUrl);
            sourceStore.markCrawled(
                    source.getId(),
                    document.sourceUrl(),
                    document.title(),
                    document.rawContent(),
                    document.collectedAt()
            );
            return new CrawledContent(
                    source.getId(),
                    document.sourceUrl(),
                    normalize(request.keyword()),
                    document.title(),
                    document.metaDescription(),
                    document.rawContent(),
                    document.collectedAt()
            );
        } catch (RuntimeException exception) {
            saveFailure(source, exception);
            throw exception;
        }
    }

    public void linkPost(CrawledContent content, java.util.UUID postId) {
        sourceStore.linkPost(content.sourceId(), postId);
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
