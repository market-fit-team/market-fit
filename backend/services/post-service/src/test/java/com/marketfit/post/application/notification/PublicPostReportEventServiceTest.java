package com.marketfit.post.application.notification;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostVisibility;

class PublicPostReportEventServiceTest {

    @Test
    void 공개_AI_리포트만_SSE로_발행한다() throws Exception {
        PublicPostReportEventService service = new PublicPostReportEventService();
        SseEmitter emitter = org.mockito.Mockito.mock(SseEmitter.class);
        service.register("test-emitter", emitter);

        service.publishIfPublicReport(report(PostVisibility.PRIVATE));
        verify(emitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));

        service.publishIfPublicReport(report(PostVisibility.PUBLIC));
        verify(emitter, times(2)).send(any(SseEmitter.SseEventBuilder.class));
    }

    @Test
    void 일반_Post는_공개여도_발행하지_않는다() throws Exception {
        PublicPostReportEventService service = new PublicPostReportEventService();
        SseEmitter emitter = org.mockito.Mockito.mock(SseEmitter.class);
        service.register("test-emitter", emitter);
        Post manual = Post.create(
                "user-1",
                "User",
                PostDraft.manual("Title", "Summary", "Content", PostCategory.TREND, 1)
        );

        service.publishIfPublicReport(manual);

        verify(emitter, times(1)).send(any(SseEmitter.SseEventBuilder.class));
        verify(emitter, never()).completeWithError(any());
    }

    private Post report(PostVisibility visibility) {
        Post post = Post.create(
                "user-1",
                "User",
                new PostDraft(
                        "Report",
                        "Summary",
                        "Content",
                        PostCategory.TREND,
                        1,
                        PostSourceType.LLM_REPORT,
                        null,
                        null,
                        null,
                        "MOCK:mock-v1"
                )
        );
        post.configureCrawlSource(null, visibility);
        return post;
    }
}
