package com.marketfit.post.core.crawling;

import java.util.List;

public record ArticleCrawlResult(
        String url,
        String title,
        String metaDescription,
        String ogTitle,
        String ogDescription,
        String usedSelector,
        List<String> paragraphs,
        int extractedTextLength,
        String status,
        String errorMessage,
        List<String> matchedKeywords,
        List<String> matchedParagraphs,
        List<String> excludedKeywords
) {
    public boolean succeeded() {
        return "CRAWLED".equals(status);
    }
}
