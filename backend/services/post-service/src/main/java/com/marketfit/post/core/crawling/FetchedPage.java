package com.marketfit.post.core.crawling;

import java.time.Instant;

public record FetchedPage(
        String url,
        String html,
        Instant collectedAt
) {
}
