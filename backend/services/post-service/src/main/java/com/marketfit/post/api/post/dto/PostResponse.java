package com.marketfit.post.api.post.dto;

import java.time.Instant;
import java.util.UUID;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostVisibility;

public record PostResponse(
        UUID id,
        String userId,
        String authorId,
        String authorName,
        String title,
        String summary,
        String content,
        String thumbnailUrl,
        PostCategory category,
        int readTimeMinutes,
        PostSourceType sourceType,
        UUID sourceId,
        PostStatus status,
        PostVisibility visibility,
        String sourceUrl,
        String sourceTitle,
        Instant collectedAt,
        String llmProvider,
        Instant publishedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static PostResponse from(Post post) {
        return new PostResponse(
                post.getId(),
                post.getUserId(),
                post.getAuthorId(),
                post.getAuthorName(),
                post.getTitle(),
                post.getSummary(),
                post.getContent(),
                post.getThumbnailUrl(),
                post.getCategory(),
                post.getReadTimeMinutes(),
                post.getSourceType(),
                post.getSourceId(),
                post.getStatus(),
                post.getVisibility(),
                post.getSourceUrl(),
                post.getSourceTitle(),
                post.getCollectedAt(),
                post.getLlmProvider(),
                post.getPublishedAt(),
                post.getCreatedAt(),
                post.getUpdatedAt()
        );
    }
}
