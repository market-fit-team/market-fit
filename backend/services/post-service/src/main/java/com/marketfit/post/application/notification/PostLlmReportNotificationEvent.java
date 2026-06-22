package com.marketfit.post.application.notification;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.marketfit.post.core.post.PostSourceType;

public record PostLlmReportNotificationEvent(
        UUID eventId,
        PostNotificationType eventType,
        Instant occurredAt,
        String producer,
        int version,
        Data data
) {
    public static PostLlmReportNotificationEvent create(
            String userId,
            UUID postId,
            String postTitle,
            String postSummary,
            String keyword,
            List<String> matchedKeywords,
            double relevanceScore
    ) {
        return new PostLlmReportNotificationEvent(
                UUID.randomUUID(),
                PostNotificationType.POST_LLM_REPORT_CREATED,
                Instant.now(),
                "post-service",
                1,
                new Data(
                        ReportCategory.FRANCHISE,
                        userId,
                        postId,
                        postTitle,
                        limit(postSummary, 100),
                        PostSourceType.LLM_REPORT,
                        keyword,
                        List.copyOf(matchedKeywords),
                        relevanceScore,
                        "/posts/" + postId
                )
        );
    }

    private static String limit(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    public record Data(
            ReportCategory category,
            String userId,
            UUID postId,
            String postTitle,
            String postSummary,
            PostSourceType sourceType,
            String keyword,
            List<String> matchedKeywords,
            double relevanceScore,
            String actionUrl
    ) {
    }
}
