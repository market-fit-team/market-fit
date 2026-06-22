package com.marketfit.post.core.crawling;

import java.time.Instant;
import java.util.List;

public record CrawledDocument(
        String sourceUrl,
        String title,
        String metaDescription,
        String ogTitle,
        String ogDescription,
        String usedSelector,
        List<String> paragraphs,
        String rawContent,
        Instant collectedAt
) {
    public CrawledDocument(
            String sourceUrl,
            String title,
            String metaDescription,
            String rawContent,
            Instant collectedAt
    ) {
        this(
                sourceUrl,
                title,
                metaDescription,
                null,
                null,
                "unknown",
                rawContent == null || rawContent.isBlank() ? List.of() : List.of(rawContent),
                rawContent,
                collectedAt
        );
    }
}
