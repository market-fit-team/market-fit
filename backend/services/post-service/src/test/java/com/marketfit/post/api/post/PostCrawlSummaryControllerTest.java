package com.marketfit.post.api.post;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.MediaType;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketfit.post.api.post.dto.CrawlSummaryRequest;
import com.marketfit.post.application.report.PostCrawlSummaryFacade;
import com.marketfit.post.application.report.PostCrawlSummaryFacade.CrawlSummaryCreation;
import com.marketfit.post.application.llm.PostLlmSummaryService;
import com.marketfit.post.application.notification.PostReportNotificationService.NotificationDecision;
import com.marketfit.post.core.crawling.CrawledContent;
import com.marketfit.post.core.crawling.InputUrlType;
import com.marketfit.post.core.llm.LlmSummaryResult;
import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostVisibility;

class PostCrawlSummaryControllerTest {

    @Test
    void X_User_Id와_요청을_Facade에_전달하고_응답_DTO를_반환한다() throws Exception {
        PostCrawlSummaryFacade facade = org.mockito.Mockito.mock(PostCrawlSummaryFacade.class);
        Environment environment = org.mockito.Mockito.mock(Environment.class);
        when(environment.acceptsProfiles(org.mockito.ArgumentMatchers.any(Profiles.class)))
                .thenReturn(true);
        PostCrawlSummaryController controller = new PostCrawlSummaryController(
                facade,
                org.mockito.Mockito.mock(com.marketfit.post.application.crawling.PostCrawlService.class),
                new CrawlSummaryActorResolver(environment)
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        ObjectMapper objectMapper = new ObjectMapper();
        CrawlSummaryRequest request = new CrawlSummaryRequest(
                "https://example.com/article",
                "AI 채용 트렌드",
                null,
                PostVisibility.PUBLIC
        );
        Post saved = Post.create(
                "user-31",
                "user-31",
                new PostDraft(
                        "AI 채용 트렌드 요약 리포트",
                        "최근 AI 엔지니어 수요가 증가하고 있습니다.",
                        "# AI 채용 트렌드",
                        PostCategory.TREND,
                        3,
                        PostSourceType.LLM_REPORT,
                        "https://example.com/article",
                        "기사 제목",
                        Instant.now(),
                        "OPENAI:gpt-4o-mini"
                )
        );
        UUID sourceId = UUID.randomUUID();
        saved.configureCrawlSource(sourceId, PostVisibility.PUBLIC);
        CrawledContent crawled = new CrawledContent(
                sourceId,
                "https://example.com/article",
                "프랜차이즈",
                "기사 제목",
                "기사 설명",
                "프랜차이즈 창업과 상권을 설명하는 기사 본문입니다.",
                Instant.now(),
                InputUrlType.ARTICLE,
                List.of("https://example.com/article"),
                1,
                0,
                2,
                1,
                List.of("프랜차이즈"),
                List.of(),
                0.5,
                "article"
        );
        var execution = new PostLlmSummaryService.SummaryExecution(
                UUID.randomUUID(),
                new LlmSummaryResult(
                        saved.getTitle(),
                        saved.getSummary(),
                        saved.getContent(),
                        "OPENAI",
                        "gpt-4o-mini",
                        Map.of()
                )
        );
        when(facade.createDetailed(eq("user-31"), eq(request))).thenReturn(
                new CrawlSummaryCreation(
                        saved,
                        crawled,
                        execution,
                        new NotificationDecision(true, com.marketfit.post.application.notification.ReportCategory.FRANCHISE)
                )
        );

        mockMvc.perform(post("/api/posts/crawl-summary")
                        .header("X-User-Id", "user-31")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("AI 채용 트렌드 요약 리포트"))
                .andExpect(jsonPath("$.sourceType").value("LLM_REPORT"))
                .andExpect(jsonPath("$.sourceId").value(sourceId.toString()))
                .andExpect(jsonPath("$.debug.notificationEligible").value(true))
                .andExpect(jsonPath("$.content").doesNotExist());
    }

    @Test
    void 인증과_local_X_User_Id가_모두_없으면_401을_반환한다() throws Exception {
        Environment environment = org.mockito.Mockito.mock(Environment.class);
        when(environment.acceptsProfiles(org.mockito.ArgumentMatchers.any(Profiles.class)))
                .thenReturn(false);
        PostCrawlSummaryController controller = new PostCrawlSummaryController(
                org.mockito.Mockito.mock(PostCrawlSummaryFacade.class),
                org.mockito.Mockito.mock(com.marketfit.post.application.crawling.PostCrawlService.class),
                new CrawlSummaryActorResolver(environment)
        );
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        mockMvc.perform(post("/api/posts/crawl-summary")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "rawContent": "원문",
                                  "visibility": "PUBLIC"
                                }
                                """))
                .andExpect(status().isUnauthorized());
    }
}
