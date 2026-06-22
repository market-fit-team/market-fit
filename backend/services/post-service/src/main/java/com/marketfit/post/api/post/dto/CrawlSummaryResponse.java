package com.marketfit.post.api.post.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.marketfit.post.application.notification.ReportCategory;
import com.marketfit.post.application.report.PostCrawlSummaryFacade.CrawlSummaryCreation;
import com.marketfit.post.core.crawling.InputUrlType;
import com.marketfit.post.core.llm.PostLlmSummaryStatus;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostSourceType;

public record CrawlSummaryResponse(
        UUID id,
        String title,
        String summary,
        String thumbnailUrl,
        PostSourceType sourceType,
        UUID sourceId,
        Instant createdAt,
        Debug debug
) {
    public static CrawlSummaryResponse from(CrawlSummaryCreation creation) {
        Post post = creation.post();
        var content = creation.crawledContent();
        var result = creation.llmExecution().result();
        return new CrawlSummaryResponse(
                post.getId(),
                post.getTitle(),
                post.getSummary(),
                post.getThumbnailUrl(),
                post.getSourceType(),
                post.getSourceId(),
                post.getCreatedAt(),
                new Debug(
                        result.provider(),
                        result.model(),
                        content.inputUrlType(),
                        content.crawledArticleCount(),
                        content.skippedArticleCount(),
                        content.bodyText().length(),
                        content.matchedKeywords(),
                        content.matchedParagraphCount(),
                        content.relevanceScore(),
                        PostLlmSummaryStatus.SUMMARIZED,
                        creation.notification().eligible(),
                        creation.notification().category()
                )
        );
    }

    public record Debug(
            String llmProvider,
            String llmModel,
            InputUrlType inputUrlType,
            int crawledArticleCount,
            int skippedArticleCount,
            int crawledTextLength,
            List<String> matchedKeywords,
            int matchedParagraphCount,
            double relevanceScore,
            PostLlmSummaryStatus llmStatus,
            boolean notificationEligible,
            ReportCategory notificationCategory
    ) {
    }
}
