package com.marketfit.post.api.post.dto;

import java.time.Instant;
import java.util.UUID;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostSourceType;

public record PostSummaryResponse(
        UUID id,
        String authorName,
        String title,
        String summary,
        PostCategory category,
        int readTimeMinutes,
        PostSourceType sourceType,
        String sourceUrl,
        String llmProvider,
        Instant publishedAt
) {
    public static PostSummaryResponse from(Post post) {
        return new PostSummaryResponse(
                post.getId(),
                post.getAuthorName(),
                post.getTitle(),
                post.getSummary(),
                post.getCategory(),
                post.getReadTimeMinutes(),
                post.getSourceType(),
                post.getSourceUrl(),
                post.getLlmProvider(),
                post.getPublishedAt()
        );
    }
}
