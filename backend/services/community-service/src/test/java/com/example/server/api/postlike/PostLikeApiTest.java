package com.example.server.api.postlike;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.example.server.support.IntegrationTestSupport;
import com.example.server.support.TestDataHelper;
import com.example.server.core.user.User;

class PostLikeApiTest extends IntegrationTestSupport {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void 로그인하지_않으면_좋아요를_누를_수_없다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        mockMvc.perform(post("/api/v1/posts/{id}/likes", postId))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 유효한_JWT가_있으면_좋아요를_누를_수_있다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        mockMvc.perform(post("/api/v1/posts/{id}/likes", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isNoContent());

        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from post_likes where post_id = ? and user_id = ?",
                Integer.class,
                postId,
                alice.getId());

        assertThat(count).isEqualTo(1);
    }

    @Test
    void 삭제된_게시글에는_좋아요를_누를_수_없다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "삭제될 글");
        testDataHelper.softDeletePost(alice, postId);

        mockMvc.perform(post("/api/v1/posts/{id}/likes", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isConflict());
    }

    @Test
    void 중복_좋아요를_눌러도_row는_하나만_유지된다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/posts/{id}/likes", postId)
                            .with(jwtFor(alice)))
                    .andExpect(status().isNoContent());
        }

        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from post_likes where post_id = ? and user_id = ?",
                Integer.class,
                postId,
                alice.getId());

        assertThat(count).isEqualTo(1);
    }

    @Test
    void 좋아요를_취소할_수_있다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");
        testDataHelper.likePost(alice, postId);

        mockMvc.perform(delete("/api/v1/posts/{id}/likes", postId)
                        .with(jwtFor(alice)))
                .andExpect(status().isNoContent());

        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from post_likes where post_id = ? and user_id = ?",
                Integer.class,
                postId,
                alice.getId());

        assertThat(count).isZero();
    }
}
