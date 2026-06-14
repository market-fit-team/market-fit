package com.example.server.api.notification;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.example.server.support.IntegrationTestSupport;
import com.example.server.support.TestDataHelper;
import com.example.server.core.user.User;

import org.springframework.beans.factory.annotation.Autowired;

class NotificationApiTest extends IntegrationTestSupport {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void 타인_글에_댓글을_달면_POST_REPLY_알림이_생성된다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        User bob = testDataHelper.createAuthentikUser("authentik-user-bob", "bob@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "Alice 원글");

        mockMvc.perform(post("/api/v1/posts/{id}/replies", rootId)
                        .with(jwtFor(bob))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Bob 댓글\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));

        mockMvc.perform(get("/api/v1/notifications?size=20")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].type").value("POST_REPLY"))
                .andExpect(jsonPath("$.items[0].actorId").value(bob.getId()))
                .andExpect(jsonPath("$.items[0].targetPostId").value(rootId))
                .andExpect(jsonPath("$.items[0].read").value(false));
    }

    @Test
    void 좋아요_중복요청에도_POST_LIKE_알림은_한번만_생성된다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        User bob = testDataHelper.createAuthentikUser("authentik-user-bob", "bob@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "Alice 원글");

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/posts/{id}/likes", rootId)
                            .with(jwtFor(bob)))
                    .andExpect(status().isNoContent());
        }

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void 자기_행동에는_알림이_생기지_않는다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "Alice 원글");

        mockMvc.perform(post("/api/v1/posts/{id}/replies", rootId)
                        .with(jwtFor(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"자기 댓글\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/posts/{id}/likes", rootId)
                        .with(jwtFor(alice)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void 읽음처리_API가_동작한다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        User bob = testDataHelper.createAuthentikUser("authentik-user-bob", "bob@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "Alice 원글");

        mockMvc.perform(post("/api/v1/posts/{id}/likes", rootId)
                        .with(jwtFor(bob)))
                .andExpect(status().isNoContent());

        Long notificationId = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString());

            return jdbcTemplate.queryForObject(
                    "select id from notifications where recipient_user_id = ? order by id desc limit 1",
                    Long.class,
                    alice.getId());
        });

        mockMvc.perform(patch("/api/v1/notifications/{id}/read", notificationId)
                        .with(jwtFor(alice)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));
    }

    @Test
    void SSE_엔드포인트는_인증이_필요하고_로그인시_async_연결된다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");

        mockMvc.perform(get("/api/v1/notifications/stream"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/notifications/stream")
                        .with(jwtFor(alice)))
                .andExpect(request().asyncStarted())
                .andExpect(status().isOk());
    }

    @Test
    void 수신자는_알림을_삭제할_수_있다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        User bob = testDataHelper.createAuthentikUser("authentik-user-bob", "bob@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "Alice 원글");

        mockMvc.perform(post("/api/v1/posts/{id}/likes", rootId)
                        .with(jwtFor(bob)))
                .andExpect(status().isNoContent());

        Long notificationId = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString());

            return jdbcTemplate.queryForObject(
                    "select id from notifications where recipient_user_id = ? order by id desc limit 1",
                    Long.class,
                    alice.getId());
        });

        mockMvc.perform(delete("/api/v1/notifications/{id}", notificationId)
                        .with(jwtFor(alice)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        mockMvc.perform(get("/api/v1/notifications?size=20")
                        .with(jwtFor(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
    }

    @Test
    void 수신자가_아닌_사용자는_알림을_삭제할_수_없다() throws Exception {
        User alice = testDataHelper.createAuthentikUser("authentik-user-alice", "alice@example.com");
        User bob = testDataHelper.createAuthentikUser("authentik-user-bob", "bob@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "Alice 원글");

        mockMvc.perform(post("/api/v1/posts/{id}/likes", rootId)
                        .with(jwtFor(bob)))
                .andExpect(status().isNoContent());

        Long notificationId = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString());

            return jdbcTemplate.queryForObject(
                    "select id from notifications where recipient_user_id = ? order by id desc limit 1",
                    Long.class,
                    alice.getId());
        });

        mockMvc.perform(delete("/api/v1/notifications/{id}", notificationId)
                        .with(jwtFor(bob)))
                .andExpect(status().isNotFound());
    }
}
