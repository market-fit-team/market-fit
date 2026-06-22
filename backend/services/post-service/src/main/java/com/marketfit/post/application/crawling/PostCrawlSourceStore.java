package com.marketfit.post.application.crawling;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.marketfit.post.core.crawling.PostCrawlSource;
import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.infrastructure.persistence.PostCrawlSourceRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostCrawlSourceStore {

    private final PostCrawlSourceRepository repository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PostCrawlSource createRequested(
            String url,
            String keyword,
            String rawContent
    ) {
        return repository.saveAndFlush(PostCrawlSource.requested(url, keyword, rawContent));
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCrawled(
            UUID sourceId,
            String finalUrl,
            String extractedTitle,
            String rawContent,
            Instant crawledAt
    ) {
        PostCrawlSource source = repository.getReferenceById(sourceId);
        source.markCrawled(finalUrl, extractedTitle, rawContent, crawledAt);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markCrawled(CrawledContent content) {
        PostCrawlSource source = repository.getReferenceById(content.sourceId());
        source.markCrawled(content);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(UUID sourceId, String errorMessage) {
        PostCrawlSource source = repository.getReferenceById(sourceId);
        source.markFailed(errorMessage);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void linkPost(UUID sourceId, UUID postId) {
        PostCrawlSource source = repository.getReferenceById(sourceId);
        source.linkPost(postId);
    }
}
