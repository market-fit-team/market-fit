package com.marketfit.post.infrastructure.notification;

import java.time.Instant;
import java.util.UUID;

import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostSourceType;

public record PostNotificationMessage(
        UUID eventId,
        String eventType,
        UUID postId,
        String actorId,
        String actorName,
        PostCategory category,
        PostSourceType sourceType,
        Instant occurredAt
) {
}
