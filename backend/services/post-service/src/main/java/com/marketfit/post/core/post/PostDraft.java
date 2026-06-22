package com.marketfit.post.core.post;

import java.time.Instant;

public record PostDraft(
        String title,
        String summary,
        String content,
        PostCategory category,
        int readTimeMinutes,
        PostSourceType sourceType,
        String sourceUrl,
        String sourceTitle,
        Instant collectedAt,
        String llmProvider
) {
    public static PostDraft manual(
            String title,
            String summary,
            String content,
            PostCategory category,
            int readTimeMinutes
    ) {
        return new PostDraft(
                title,
                summary,
                content,
                category,
                readTimeMinutes,
                PostSourceType.MANUAL,
                null,
                null,
                null,
                null
        );
    }
}
