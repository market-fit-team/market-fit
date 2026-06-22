package com.marketfit.post.core.post;

import java.time.Instant;
import java.util.UUID;

public record PostChangedEvent(
        UUID eventId,
        String eventType,
        UUID postId,
        String actorId,
        String actorName,
        PostCategory category,
        PostSourceType sourceType,
        Instant occurredAt
) {
    public static PostChangedEvent of(String eventType, Post post) {
        return new PostChangedEvent(
                UUID.randomUUID(),
                eventType,
                post.getId(),
                post.getAuthorId(),
                post.getAuthorName(),
                post.getCategory(),
                post.getSourceType(),
                Instant.now()
        );
    }
}
