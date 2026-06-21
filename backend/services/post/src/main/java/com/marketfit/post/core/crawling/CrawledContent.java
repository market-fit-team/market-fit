package com.marketfit.post.core.crawling;

import java.time.Instant;
import java.util.UUID;

public record CrawledContent(
        UUID sourceId,
        String sourceUrl,
        String keyword,
        String title,
        String metaDescription,
        String bodyText,
        Instant crawledAt
) {
    private static final int MAX_LLM_INPUT_CHARACTERS = 40_000;

    public CrawledDocument toLlmDocument() {
        String llmInput = bodyText.length() <= MAX_LLM_INPUT_CHARACTERS
                ? bodyText
                : bodyText.substring(0, MAX_LLM_INPUT_CHARACTERS);
        return new CrawledDocument(
                sourceUrl,
                title,
                metaDescription,
                llmInput,
                crawledAt
        );
    }
}
