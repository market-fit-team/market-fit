package com.marketfit.post.api.post.dto;

import java.util.List;

import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.crawling.InputUrlType;

public record CrawlPreviewResponse(
        String inputUrl,
        InputUrlType inputUrlType,
        List<String> discoveredArticleUrls,
        int crawledArticleCount,
        int skippedArticleCount,
        String usedSelector,
        int totalParagraphCount,
        int matchedParagraphCount,
        List<String> matchedKeywords,
        List<String> excludedKeywords,
        double relevanceScore,
        int extractedTextLength,
        String extractedTextPreview
) {
    private static final int PREVIEW_LIMIT = 2_000;

    public static CrawlPreviewResponse from(CrawledContent content) {
        String body = content.bodyText();
        String preview = body.length() <= PREVIEW_LIMIT
                ? body
                : body.substring(0, PREVIEW_LIMIT).trim() + "…";
        return new CrawlPreviewResponse(
                content.sourceUrl(),
                content.inputUrlType(),
                content.discoveredArticleUrls(),
                content.crawledArticleCount(),
                content.skippedArticleCount(),
                content.usedSelector(),
                content.totalParagraphCount(),
                content.matchedParagraphCount(),
                content.matchedKeywords(),
                content.excludedKeywords(),
                content.relevanceScore(),
                body.length(),
                preview
        );
    }
}
