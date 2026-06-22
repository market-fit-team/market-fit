package com.marketfit.post.core.crawling;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CrawledContent(
        UUID sourceId,
        String sourceUrl,
        String keyword,
        String title,
        String metaDescription,
        String bodyText,
        Instant crawledAt,
        InputUrlType inputUrlType,
        List<String> discoveredArticleUrls,
        int crawledArticleCount,
        int skippedArticleCount,
        int totalParagraphCount,
        int matchedParagraphCount,
        List<String> matchedKeywords,
        List<String> excludedKeywords,
        double relevanceScore,
        String usedSelector
) {
    private static final int MAX_LLM_INPUT_CHARACTERS = 12_000;

    public CrawledContent(
            UUID sourceId,
            String sourceUrl,
            String keyword,
            String title,
            String metaDescription,
            String bodyText,
            Instant crawledAt
    ) {
        this(
                sourceId,
                sourceUrl,
                keyword,
                title,
                metaDescription,
                bodyText,
                crawledAt,
                InputUrlType.UNKNOWN,
                List.of(),
                1,
                0,
                1,
                1,
                List.of(),
                List.of(),
                1.0,
                "unknown"
        );
    }

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
