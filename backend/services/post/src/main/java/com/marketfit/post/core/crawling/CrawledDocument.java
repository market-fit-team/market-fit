package com.marketfit.post.core.crawling;

import java.time.Instant;

public record CrawledDocument(
        String sourceUrl,
        String title,
        String metaDescription,
        String rawContent,
        Instant collectedAt
) {
}
