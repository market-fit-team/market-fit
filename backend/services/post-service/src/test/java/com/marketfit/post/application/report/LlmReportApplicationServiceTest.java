package com.marketfit.post.application.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.api.report.dto.CreateLlmReportRequest;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostVisibility;

class LlmReportApplicationServiceTest {

    @Test
    void 레거시_요청을_PRIVATE_crawl_summary로_변환한다() {
        PostCrawlSummaryFacade facade = org.mockito.Mockito.mock(PostCrawlSummaryFacade.class);
        LlmReportApplicationService service = new LlmReportApplicationService(facade);
        Post saved = Post.create(
                "user-1",
                "user-1",
                PostDraft.manual("제목", "요약", "본문", PostCategory.TREND, 3)
        );
        CrawlSummaryRequest expected = new CrawlSummaryRequest(
                "https://example.com",
                null,
                "원문",
                PostVisibility.PRIVATE
        );
        when(facade.create("user-1", expected)).thenReturn(saved);

        Post result = service.createReport(
                new CreateLlmReportRequest(
                        "https://example.com",
                        "원문",
                        PostCategory.TREND
                ),
                "user-1",
                "사용자"
        );

        assertThat(result).isSameAs(saved);
        verify(facade).create("user-1", expected);
    }
}
