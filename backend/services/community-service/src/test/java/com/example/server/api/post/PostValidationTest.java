package com.example.server.api.post;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import com.example.server.support.IntegrationTestSupport;
import com.example.server.support.TestDataHelper;
import com.example.server.core.user.User;

class PostValidationTest extends IntegrationTestSupport {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void 내용이_비어있으면_게시글을_생성할_수_없다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");

        mockMvc.perform(post("/api/v1/posts")
                        .with(jwtFor(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 내용이_비어있어도_mediaAttachmentIds가_있으면_게시글을_생성할_수_있다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        Long mediaId = testDataHelper.createUploadedMedia(alice, "posts/2026/05/22/%d/uploaded.png".formatted(alice.getId()));

        mockMvc.perform(post("/api/v1/posts")
                        .with(jwtFor(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "   ",
                                  "mediaAttachmentIds": [%d]
                                }
                                """.formatted(mediaId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mediaAttachments.length()").value(1))
                .andExpect(jsonPath("$.content").value("   "));
    }
}
