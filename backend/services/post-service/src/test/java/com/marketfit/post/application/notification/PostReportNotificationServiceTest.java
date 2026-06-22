package com.marketfit.post.application.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.crawling.InputUrlType;
import com.marketfit.post.core.llm.PostLlmSummaryStatus;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostVisibility;

class PostReportNotificationServiceTest {

    @Test
    void payload에는_안전한_Post_식별정보만_포함한다() {
        PostLlmReportNotificationAdapter adapter =
                org.mockito.Mockito.mock(PostLlmReportNotificationAdapter.class);
        PostReportNotificationService service = new PostReportNotificationService(
                new FranchiseReportNotificationPolicy(),
                adapter
        );
        Post post = reportPost();

        var decision = service.publishIfEligible(
                post, crawled(), "user-1", PostLlmSummaryStatus.SUMMARIZED
        );

        ArgumentCaptor<PostLlmReportNotificationEvent> event =
                ArgumentCaptor.forClass(PostLlmReportNotificationEvent.class);
        verify(adapter).publish(event.capture());
        assertThat(decision.eligible()).isTrue();
        assertThat(event.getValue().data().postId()).isEqualTo(post.getId());
        assertThat(event.getValue().data().userId()).isEqualTo("user-1");
        assertThat(event.getValue().data().category()).isEqualTo(ReportCategory.FRANCHISE);
        assertThat(event.getValue().toString())
                .doesNotContain("OPENAI_API_KEY", "rawContent", "prompt");
    }

    @Test
    void adapter_실패는_호출자에게_전파하지_않는다() {
        PostLlmReportNotificationAdapter adapter =
                org.mockito.Mockito.mock(PostLlmReportNotificationAdapter.class);
        doThrow(new IllegalStateException("broker down")).when(adapter).publish(any());
        PostReportNotificationService service = new PostReportNotificationService(
                new FranchiseReportNotificationPolicy(),
                adapter
        );

        var decision = service.publishIfEligible(
                reportPost(), crawled(), "user-1", PostLlmSummaryStatus.SUMMARIZED
        );

        assertThat(decision.eligible()).isTrue();
    }

    @Test
    void 비프랜차이즈_리포트는_adapter를_호출하지_않는다() {
        PostLlmReportNotificationAdapter adapter =
                org.mockito.Mockito.mock(PostLlmReportNotificationAdapter.class);
        PostReportNotificationService service = new PostReportNotificationService(
                new FranchiseReportNotificationPolicy(),
                adapter
        );
        CrawledContent nonFranchise = new CrawledContent(
                UUID.randomUUID(), "https://example.com", "상권 임대료",
                "제목", "설명", "본문", Instant.now(),
                InputUrlType.ARTICLE, List.of("https://example.com/a"),
                1, 0, 3, 1, List.of("상권", "임대료"),
                List.of(), 0.68, "article"
        );

        var decision = service.publishIfEligible(
                reportPost(), nonFranchise, "user-1", PostLlmSummaryStatus.SUMMARIZED
        );

        assertThat(decision.eligible()).isFalse();
        verify(adapter, never()).publish(any());
    }

    private Post reportPost() {
        Post post = Post.create(
                "user-1",
                "테스터",
                new PostDraft(
                        "프랜차이즈 창업 리포트", "요약", "본문",
                        PostCategory.TREND, 1, PostSourceType.LLM_REPORT,
                        null, null, Instant.now(), "MOCK:mock-v1"
                )
        );
        post.configureCrawlSource(UUID.randomUUID(), PostVisibility.PUBLIC);
        return post;
    }

    private CrawledContent crawled() {
        return new CrawledContent(
                UUID.randomUUID(), "https://example.com", "프랜차이즈 창업",
                "제목", "설명", "본문", Instant.now(),
                InputUrlType.SEARCH_RESULT, List.of("https://example.com/a"),
                1, 0, 3, 1, List.of("프랜차이즈", "가맹점"),
                List.of(), 0.68, "article"
        );
    }
}
