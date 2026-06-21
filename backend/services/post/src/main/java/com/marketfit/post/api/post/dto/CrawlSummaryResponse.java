package com.marketfit.post.api.post.dto;

import java.time.Instant;
import java.util.UUID;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostSourceType;

public record CrawlSummaryResponse(
        UUID id,
        String title,
        String summary,
        String thumbnailUrl,
        PostSourceType sourceType,
        UUID sourceId,
        Instant createdAt
) {
    public static CrawlSummaryResponse from(Post post) {
        return new CrawlSummaryResponse(
                post.getId(),
                post.getTitle(),
                post.getSummary(),
                post.getThumbnailUrl(),
                post.getSourceType(),
                post.getSourceId(),
                post.getCreatedAt()
        );
    }
}
