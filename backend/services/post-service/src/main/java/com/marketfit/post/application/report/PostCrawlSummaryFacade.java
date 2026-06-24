package com.marketfit.post.application.report;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.application.crawling.PostCrawlService;
import com.marketfit.post.application.llm.PostLlmSummaryService;
import com.marketfit.post.application.notification.PostReportNotificationService;
import com.marketfit.post.application.notification.PostReportNotificationService.NotificationDecision;
import com.marketfit.post.application.notification.PublicPostReportEventService;
import com.marketfit.post.application.post.PostService;
import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.llm.LlmReportRequest;
import com.marketfit.post.core.llm.PostLlmSummaryStatus;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostVisibility;

@Service
public class PostCrawlSummaryFacade {

    private final PostCrawlService postCrawlService;
    private final PostLlmSummaryService postLlmSummaryService;
    private final PostService postService;
    private final PostReportNotificationService notificationService;
    private final PublicPostReportEventService publicEventService;

    @Autowired
    public PostCrawlSummaryFacade(
            PostCrawlService postCrawlService,
            PostLlmSummaryService postLlmSummaryService,
            PostService postService,
            PostReportNotificationService notificationService,
            PublicPostReportEventService publicEventService
    ) {
        this.postCrawlService = postCrawlService;
        this.postLlmSummaryService = postLlmSummaryService;
        this.postService = postService;
        this.notificationService = notificationService;
        this.publicEventService = publicEventService;
    }

    public PostCrawlSummaryFacade(
            PostCrawlService postCrawlService,
            PostLlmSummaryService postLlmSummaryService,
            PostService postService
    ) {
        this(postCrawlService, postLlmSummaryService, postService, null, null);
    }

    public Post create(String userId, CrawlSummaryRequest request) {
        return createDetailed(userId, request).post();
    }

    public CrawlSummaryCreation createDetailed(String userId, CrawlSummaryRequest request) {
        PostVisibility visibility = request.visibility() == null
                ? PostVisibility.PUBLIC
                : request.visibility();
        CrawledContent crawledContent = postCrawlService.crawl(request);
        PostLlmSummaryService.SummaryExecution execution = postLlmSummaryService.summarize(
                new LlmReportRequest(crawledContent.toLlmDocument(), null)
        );
        var result = execution.result();
        PostDraft draft = new PostDraft(
                result.title(),
                result.summary(),
                result.content(),
                PostCategory.TREND,
                readTimeMinutes(result.content()),
                PostSourceType.LLM_REPORT,
                crawledContent.sourceUrl(),
                crawledContent.title(),
                crawledContent.crawledAt(),
                result.provider() + ":" + result.model()
        );

        Post post;
        try {
            post = postService.createCrawlSummary(
                    userId.trim(),
                    draft,
                    crawledContent,
                    visibility
            );
        } catch (DataAccessException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "LLM 요약은 완료됐지만 Post 저장에 실패했습니다.",
                    exception
            );
        }

        try {
            postCrawlService.linkPost(crawledContent, post.getId());
            postLlmSummaryService.linkPost(execution, post.getId());
        } catch (DataAccessException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Post 저장은 완료됐지만 생성 메타데이터 연결에 실패했습니다.",
                    exception
            );
        }
        if (publicEventService != null) {
            publicEventService.publishIfPublicReport(post);
        }
        NotificationDecision notification = notificationService == null
                ? new NotificationDecision(false, null)
                : notificationService.publishIfEligible(
                        post,
                        crawledContent,
                        userId.trim(),
                        PostLlmSummaryStatus.SUMMARIZED
                );
        return new CrawlSummaryCreation(post, crawledContent, execution, notification);
    }

    private int readTimeMinutes(String content) {
        return Math.max(1, Math.min(120, (int) Math.ceil(content.length() / 500.0)));
    }

    public record CrawlSummaryCreation(
            Post post,
            CrawledContent crawledContent,
            PostLlmSummaryService.SummaryExecution llmExecution,
            NotificationDecision notification
    ) {
    }
}
