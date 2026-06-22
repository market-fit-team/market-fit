package com.marketfit.post.application.notification;

import org.springframework.stereotype.Service;

import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.llm.PostLlmSummaryStatus;
import com.marketfit.post.core.post.Post;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PostReportNotificationService {

    private final FranchiseReportNotificationPolicy policy;
    private final PostLlmReportNotificationAdapter adapter;

    public NotificationDecision publishIfEligible(
            Post post,
            CrawledContent content,
            String userId,
            PostLlmSummaryStatus llmStatus
    ) {
        boolean eligible = policy.isEligible(
                content.matchedKeywords(),
                content.matchedParagraphCount(),
                content.relevanceScore(),
                post.getSourceType(),
                post.getStatus(),
                llmStatus
        );
        if (!eligible) {
            log.debug(
                    "[PostEvent] Skip notification: not franchise related. postId={}, matchedKeywords={}",
                    post.getId(),
                    content.matchedKeywords()
            );
            return new NotificationDecision(false, null);
        }

        PostLlmReportNotificationEvent event = PostLlmReportNotificationEvent.create(
                userId,
                post.getId(),
                post.getTitle(),
                post.getSummary(),
                content.keyword(),
                content.matchedKeywords(),
                content.relevanceScore()
        );
        try {
            adapter.publish(event);
            log.info(
                    "[PostEvent] Published eventType={}, category={}, postId={}, userId={}",
                    event.eventType(),
                    event.data().category(),
                    post.getId(),
                    userId
            );
        } catch (RuntimeException exception) {
            log.warn(
                    "[PostEvent] Failed to publish eventType={}, postId={}",
                    event.eventType(),
                    post.getId()
            );
        }
        return new NotificationDecision(true, ReportCategory.FRANCHISE);
    }

    public record NotificationDecision(
            boolean eligible,
            ReportCategory category
    ) {
    }
}
