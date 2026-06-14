package com.example.server.api.scheduledpost;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;

import com.example.server.core.post.Post;
import com.example.server.core.post.PostCommandService;
import com.example.server.core.post.PostDraft;
import com.example.server.core.user.User;
import com.example.server.support.IntegrationTestSupport;
import com.example.server.support.TestDataHelper;

class ScheduledPostApiTest extends IntegrationTestSupport {

    @Autowired
    private TestDataHelper testDataHelper;

    @Autowired
    private PostCommandService postCommandService;

    @Test
    void 예약_게시글_생성은_mediaAttachmentIds를_예약_draft로_저장한다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long mediaId = testDataHelper.createUploadedMedia(alice, "posts/2026/05/24/%d/scheduled.png".formatted(alice.getId()));

        mockMvc.perform(post("/api/v1/scheduled-posts")
                        .with(jwtFor(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "예약 이미지 글",
                                  "mediaAttachmentIds": [%d],
                                  "scheduledAt": "%s"
                                }
                                """.formatted(mediaId, futureScheduledAt())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("예약 이미지 글"));

        String storedMediaIds = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString());
            return jdbcTemplate.queryForObject(
                    "select media_attachment_ids::text from scheduled_posts where user_id = ?",
                    String.class,
                    alice.getId());
        });

        assertThat(storedMediaIds).isEqualTo("[%d]".formatted(mediaId));
    }

    @Test
    void 예약_게시글은_내용이_비어있어도_mediaAttachmentIds가_있으면_생성할_수_있다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long mediaId = testDataHelper.createUploadedMedia(alice, "posts/2026/05/24/%d/scheduled-image-only.png".formatted(alice.getId()));

        mockMvc.perform(post("/api/v1/scheduled-posts")
                        .with(jwtFor(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "   ",
                                  "mediaAttachmentIds": [%d],
                                  "scheduledAt": "%s"
                                }
                                """.formatted(mediaId, futureScheduledAt())))
                .andExpect(status().isCreated());
    }

    @Test
    void 예약_게시글은_내용과_이미지가_모두_비어있으면_생성할_수_없다() throws Exception {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");

        mockMvc.perform(post("/api/v1/scheduled-posts")
                        .with(jwtFor(alice))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "   ",
                                  "mediaAttachmentIds": [],
                                  "scheduledAt": "%s"
                                }
                                """.formatted(futureScheduledAt())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 예약_발행용_게시글_생성은_일반_게시글과_같은_첨부_경로를_사용한다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long mediaId = testDataHelper.createUploadedMedia(alice, "posts/2026/05/24/%d/published-from-scheduled.png".formatted(alice.getId()));

        Post post = postCommandService.createRootFromScheduled(
                alice,
                new PostDraft("", List.of(mediaId)));

        Long attachedCount = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString());
            return jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from post_media_attachments
                    where post_id = ?
                      and status = 'ATTACHED'
                    """,
                    Long.class,
                    post.getId());
        });

        assertThat(attachedCount).isEqualTo(1L);
    }

    @Test
    void 예약_발행용_게시글_생성은_일반_게시글과_같은_첨부_검증을_사용한다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long otherUserMediaId = testDataHelper.createUploadedMedia(bob, "posts/2026/05/24/%d/other-user.png".formatted(bob.getId()));
        Long alreadyAttachedPostId = testDataHelper.createRootPost(alice, "이미 첨부된 이미지가 있는 글");
        Long alreadyAttachedMediaId = testDataHelper.createAttachedMedia(alice, alreadyAttachedPostId, "posts/2026/05/24/%d/already-attached.png".formatted(alice.getId()));

        assertThatThrownBy(() -> postCommandService.createRootFromScheduled(
                alice,
                new PostDraft("다른 사용자 이미지", List.of(otherUserMediaId))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        assertThatThrownBy(() -> postCommandService.createRootFromScheduled(
                alice,
                new PostDraft("이미 첨부된 이미지", List.of(alreadyAttachedMediaId))))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(error -> ((ResponseStatusException) error).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private String futureScheduledAt() {
        return Instant.now().plus(5, ChronoUnit.MINUTES).truncatedTo(ChronoUnit.SECONDS).toString();
    }
}
