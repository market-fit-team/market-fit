package com.marketfit.post.application.report;

import org.springframework.stereotype.Service;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.api.report.dto.CreateLlmReportRequest;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostVisibility;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class LlmReportApplicationService {

    private final PostCrawlSummaryFacade crawlSummaryFacade;

    public Post createReport(
            CreateLlmReportRequest request,
            String authorId,
            String authorName
    ) {
        CrawlSummaryRequest crawlRequest = new CrawlSummaryRequest(
                request.url(),
                null,
                request.rawContent(),
                PostVisibility.PRIVATE
        );
        return crawlSummaryFacade.create(authorId, crawlRequest);
    }

    public Post createReport(
            CrawlSummaryRequest request,
            String authorId,
            String authorName
    ) {
        return crawlSummaryFacade.create(authorId, request);
    }
}
