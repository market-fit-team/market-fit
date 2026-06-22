package com.marketfit.post.api.post.dto;

import java.time.Instant;
import java.util.UUID;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostSourceType;

public record MainPostResponse(
        UUID id,
        String title,
        String summary,
        String thumbnailUrl,
        PostSourceType sourceType,
        Instant createdAt
) {
    public static MainPostResponse from(Post post) {
        return new MainPostResponse(
                post.getId(),
                post.getTitle(),
                post.getSummary(),
                post.getThumbnailUrl(),
                post.getSourceType(),
                post.getCreatedAt()
        );
    }
}
