package com.marketfit.post.core.crawling;

import java.util.List;

public record ArticleLinkCandidate(
        String url,
        String text,
        int score,
        List<String> matchedKeywords
) {
}
