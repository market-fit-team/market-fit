package com.marketfit.post.api.post;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.marketfit.post.api.post.dto.MainPostResponse;
import com.marketfit.post.application.post.MainPostService;
import com.marketfit.post.core.post.PostSourceType;

class MainPostControllerTest {

    @Test
    void limit을_Service에_전달하고_요구된_DTO만_반환한다() throws Exception {
        MainPostService service = org.mockito.Mockito.mock(MainPostService.class);
        MainPostController controller = new MainPostController(service);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        UUID id = UUID.randomUUID();
        when(service.findMainPosts(5)).thenReturn(List.of(
                new MainPostResponse(
                        id,
                        "AI 채용 트렌드",
                        "요약",
                        null,
                        PostSourceType.LLM_REPORT,
                        Instant.parse("2026-06-21T01:00:00Z")
                )
        ));

        mockMvc.perform(get("/api/posts/main").param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id.toString()))
                .andExpect(jsonPath("$[0].title").value("AI 채용 트렌드"))
                .andExpect(jsonPath("$[0].summary").value("요약"))
                .andExpect(jsonPath("$[0].sourceType").value("LLM_REPORT"))
                .andExpect(jsonPath("$[0].content").doesNotExist())
                .andExpect(jsonPath("$[0].visibility").doesNotExist());

        verify(service).findMainPosts(5);
    }

    @Test
    void limit이_없으면_null을_Service에_전달한다() throws Exception {
        MainPostService service = org.mockito.Mockito.mock(MainPostService.class);
        MainPostController controller = new MainPostController(service);
        MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
        when(service.findMainPosts(null)).thenReturn(List.of());

        mockMvc.perform(get("/api/posts/main"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());

        verify(service).findMainPosts(null);
    }
}
