package com.example.server.api.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import com.example.server.api.post.dto.CursorPageResponse;
import com.example.server.api.post.dto.PostSummaryResponse;
import com.example.server.support.IntegrationTestSupport;
import com.example.server.support.TestDataHelper;
import com.example.server.core.user.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

class PostQueryApiTest extends IntegrationTestSupport {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void 오프셋_페이징_목록_조회_시_좋아요_개수와_본인_좋아요_여부가_정상_노출된다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");

        Long postId1 = testDataHelper.createPost(alice, "Alice 1번 글");
        Long postId2 = testDataHelper.createPost(bob, "Bob 2번 글");

        testDataHelper.likePost(alice, postId1);
        testDataHelper.likePost(bob, postId1);
        testDataHelper.likePost(bob, postId2);

        mockMvc.perform(get("/api/v1/posts?page=0&size=10")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[1].id").value(postId1))
                .andExpect(jsonPath("$.content[1].likeCount").value(2))
                .andExpect(jsonPath("$.content[1].likedByMe").value(true))
                .andExpect(jsonPath("$.content[0].id").value(postId2))
                .andExpect(jsonPath("$.content[0].likeCount").value(1))
                .andExpect(jsonPath("$.content[0].likedByMe").value(false));
    }

    @Test
    void 피드에는_root_post만_노출된다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long root1 = testDataHelper.createRootPost(alice, "원글1");
        testDataHelper.createReply(alice, root1, "원글1 댓글");
        Long root2 = testDataHelper.createRootPost(alice, "원글2");

        mockMvc.perform(get("/api/v1/posts?page=0&size=10")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].id").value(root2))
                .andExpect(jsonPath("$.content[1].id").value(root1));
    }

    @Test
    void 커서_페이징_조회_시_nextCursor를_통해_중복_없이_연속_페이징_스크롤이_가능하다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");

        Long id1 = testDataHelper.createPost(alice, "게시글 1");
        Thread.sleep(10);
        Long id2 = testDataHelper.createPost(alice, "게시글 2");
        Thread.sleep(10);
        Long id3 = testDataHelper.createPost(alice, "게시글 3");

        MvcResult result1 = mockMvc.perform(get("/api/v1/posts/cursor?size=2")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value(id3))
                .andExpect(jsonPath("$.items[1].id").value(id2))
                .andExpect(jsonPath("$.hasNext").value(true))
                .andExpect(jsonPath("$.nextCursor").exists())
                .andReturn();

        String body1 = result1.getResponse().getContentAsString();
        CursorPageResponse<PostSummaryResponse> response1 = objectMapper.readValue(
                body1,
                new TypeReference<>() {});
        String cursorToken = response1.nextCursor();
        assertThat(cursorToken).isNotNull();

        mockMvc.perform(get("/api/v1/posts/cursor?size=2&cursor=" + cursorToken)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(id1))
                .andExpect(jsonPath("$.hasNext").value(false))
                .andExpect(jsonPath("$.nextCursor").isEmpty());
    }

    @Test
    void replies_조회는_직계_자식만_반환한다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "원글");
        Long child1 = testDataHelper.createReply(alice, rootId, "댓글1");
        Long child2 = testDataHelper.createReply(alice, rootId, "댓글2");
        testDataHelper.createReply(alice, child1, "대댓글");

        mockMvc.perform(get("/api/v1/posts/{postId}/replies?size=20", rootId)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value(child1))
                .andExpect(jsonPath("$.items[1].id").value(child2));
    }

    @Test
    void thread_조회는_ancestors와_현재글_그리고_직계_replies를_반환한다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long root = testDataHelper.createRootPost(alice, "원글");
        Long reply1 = testDataHelper.createReply(alice, root, "댓글1");
        Long reply2 = testDataHelper.createReply(alice, reply1, "댓글2");
        Long reply3 = testDataHelper.createReply(alice, reply2, "댓글3");

        mockMvc.perform(get("/api/v1/posts/{postId}/thread?size=20", reply2)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ancestors.length()").value(2))
                .andExpect(jsonPath("$.ancestors[0].id").value(root))
                .andExpect(jsonPath("$.ancestors[1].id").value(reply1))
                .andExpect(jsonPath("$.post.id").value(reply2))
                .andExpect(jsonPath("$.replies.items.length()").value(1))
                .andExpect(jsonPath("$.replies.items[0].id").value(reply3));
    }

    @Test
    void 댓글_작성_시_parent_root_depth가_설정된다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "원글");

        mockMvc.perform(post("/api/v1/posts/{id}/replies", rootId)
                        .with(jwtFor(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"댓글\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.parentId").value(rootId))
                .andExpect(jsonPath("$.rootId").value(rootId))
                .andExpect(jsonPath("$.depth").value(1));
    }

    @Test
    void 단건_조회_응답에_mediaAttachments가_포함된다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createRootPost(alice, "이미지 포함 글");
        testDataHelper.createAttachedMedia(alice, postId, "posts/2026/05/22/%d/detail.png".formatted(alice.getId()));

        mockMvc.perform(get("/api/v1/posts/{id}", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(postId))
                .andExpect(jsonPath("$.mediaAttachments.length()").value(1))
                .andExpect(jsonPath("$.mediaAttachments[0].contentType").value("image/png"))
                .andExpect(jsonPath("$.mediaAttachments[0].status").value("ATTACHED"))
                .andExpect(jsonPath("$.mediaAttachments[0].url").isString());
    }

    @Test
    void 다른_사용자도_피드에서_attached_media를_조회할_수_있다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long postId = testDataHelper.createRootPost(alice, "Alice 이미지 글");
        testDataHelper.createAttachedMedia(alice, postId, "posts/2026/05/22/%d/feed.png".formatted(alice.getId()));

        mockMvc.perform(get("/api/v1/posts?page=0&size=10")
                        .with(jwtFor(bob)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(postId))
                .andExpect(jsonPath("$.content[0].mediaAttachments.length()").value(1))
                .andExpect(jsonPath("$.content[0].mediaAttachments[0].status").value("ATTACHED"));
    }

    @Test
    void 삭제된_thread_게시글은_mediaAttachments를_노출하지_않는다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "원글");
        Long replyId = testDataHelper.createReply(alice, rootId, "삭제될 댓글");
        testDataHelper.createAttachedMedia(alice, replyId, "posts/2026/05/22/%d/deleted.png".formatted(alice.getId()));
        testDataHelper.softDeletePost(alice, replyId);

        mockMvc.perform(get("/api/v1/posts/{postId}/thread?size=20", replyId)
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.post.id").value(replyId))
                .andExpect(jsonPath("$.post.deleted").value(true))
                .andExpect(jsonPath("$.post.mediaAttachments.length()").value(0));
    }
}
