package com.example.server.db;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;

import com.example.server.support.IntegrationTestSupport;
import com.example.server.support.TestDataHelper;
import com.example.server.core.user.User;

class PostRlsPolicyTest extends IntegrationTestSupport {

    @Autowired
    private TestDataHelper testDataHelper;

    @Test
    void current_user_id가_없으면_posts_insert가_실패한다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "원글");

        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.update(
                    "insert into posts(content, user_id, parent_id, root_id, depth) values (?, ?, ?, ?, ?)",
                    "RLS 실패 테스트",
                    alice.getId(),
                    rootId,
                    rootId,
                    1
            );
        })).isInstanceOf(DataAccessException.class);
    }

    @Test
    void 다른_사용자_id로_posts_insert하면_실패한다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long rootId = testDataHelper.createRootPost(alice, "원글");

        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    bob.getId().toString()
            );

            jdbcTemplate.update(
                    "insert into posts(content, user_id, parent_id, root_id, depth) values (?, ?, ?, ?, ?)",
                    "Alice 이름으로 생성 시도",
                    alice.getId(),
                    rootId,
                    rootId,
                    1
            );
        })).isInstanceOf(DataAccessException.class);
    }

    @Test
    void 작성자가_아니면_content_update가_0건만_반영된다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        Integer updated = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    bob.getId().toString()
            );

            return jdbcTemplate.update(
                    "update posts set content = ? where id = ?",
                    "Bob의 수정 시도",
                    postId
            );
        });

        assertThat(updated).isZero();
    }

    @Test
    void 작성자가_아니면_deleted_at_update가_0건만_반영된다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        Integer updated = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    bob.getId().toString()
            );

            return jdbcTemplate.update(
                    "update posts set deleted_at = now() where id = ?",
                    postId
            );
        });

        assertThat(updated).isZero();
    }

    @Test
    void 작성자는_update할_수_있다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "수정 전");

        Integer updated = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString()
            );

            return jdbcTemplate.update(
                    "update posts set content = ? where id = ?",
                    "수정 후",
                    postId
            );
        });

        assertThat(updated).isEqualTo(1);
    }

    @Test
    void 작성자가_아니면_delete가_0건만_반영된다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        Integer deleted = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    bob.getId().toString()
            );

            return jdbcTemplate.update("delete from posts where id = ?", postId);
        });

        assertThat(deleted).isZero();
    }

    @Test
    void current_user_id가_없으면_post_likes_insert가_실패한다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.update(
                    "insert into post_likes(post_id, user_id) values (?, ?)",
                    postId,
                    alice.getId()
            );
        })).isInstanceOf(DataAccessException.class);
    }

    @Test
    void 다른_사용자_id로_post_likes_insert하면_실패한다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    bob.getId().toString()
            );

            jdbcTemplate.update(
                    "insert into post_likes(post_id, user_id) values (?, ?)",
                    postId,
                    alice.getId()
            );
        })).isInstanceOf(DataAccessException.class);
    }

    @Test
    void 다른_사용자의_좋아요_delete는_0건만_반영된다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");
        testDataHelper.likePost(alice, postId);

        Integer deleted = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    bob.getId().toString()
            );

            return jdbcTemplate.update(
                    "delete from post_likes where post_id = ? and user_id = ?",
                    postId,
                    alice.getId()
            );
        });

        assertThat(deleted).isZero();
    }

    @Test
    void 본인_id로_post_likes_insert와_delete는_성공한다() {
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(alice, "Alice 글");

        Integer inserted = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString()
            );

            return jdbcTemplate.update(
                    "insert into post_likes(post_id, user_id) values (?, ?)",
                    postId,
                    alice.getId()
            );
        });
        assertThat(inserted).isEqualTo(1);

        Integer deleted = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString()
            );

            return jdbcTemplate.update(
                    "delete from post_likes where post_id = ? and user_id = ?",
                    postId,
                    alice.getId()
            );
        });
        assertThat(deleted).isEqualTo(1);
    }

    @Test
    void current_user_id가_없으면_notifications_select결과는_0건이다() {
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(bob, "Bob 글");

        transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString()
            );
            jdbcTemplate.update(
                    """
                    insert into notifications(recipient_user_id, actor_user_id, type, target_post_id, source_post_id)
                    values (?, ?, 'POST_LIKE', ?, null)
                    """,
                    bob.getId(),
                    alice.getId(),
                    postId
            );
        });

        Integer count = transactionTemplate.execute(status ->
                jdbcTemplate.queryForObject("select count(*) from notifications", Integer.class));

        assertThat(count).isZero();
    }

    @Test
    void recipient는_본인_notifications를_조회할_수_있다() {
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        Long postId = testDataHelper.createPost(bob, "Bob 글");

        transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString()
            );
            jdbcTemplate.update(
                    """
                    insert into notifications(recipient_user_id, actor_user_id, type, target_post_id, source_post_id)
                    values (?, ?, 'POST_LIKE', ?, null)
                    """,
                    bob.getId(),
                    alice.getId(),
                    postId
            );
        });

        Integer count = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    bob.getId().toString()
            );
            return jdbcTemplate.queryForObject("select count(*) from notifications", Integer.class);
        });

        assertThat(count).isEqualTo(1);
    }

    @Test
    void recipient가_아니면_notifications_update가_0건이다() {
        User bob = testDataHelper.createKeycloakUser("better-auth-user-bob", "bob@example.com");
        User alice = testDataHelper.createKeycloakUser("better-auth-user-alice", "alice@example.com");
        User charlie = testDataHelper.createKeycloakUser("better-auth-user-charlie", "charlie@example.com");
        Long postId = testDataHelper.createPost(bob, "Bob 글");

        transactionTemplate.executeWithoutResult(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    alice.getId().toString()
            );
            jdbcTemplate.update(
                    """
                    insert into notifications(recipient_user_id, actor_user_id, type, target_post_id, source_post_id)
                    values (?, ?, 'POST_LIKE', ?, null)
                    """,
                    bob.getId(),
                    alice.getId(),
                    postId
            );
        });

        Integer updated = transactionTemplate.execute(status -> {
            jdbcTemplate.queryForObject(
                    "select set_config('app.current_user_id', ?, true)",
                    String.class,
                    charlie.getId().toString()
            );
            return jdbcTemplate.update("update notifications set read_at = now() where recipient_user_id = ?", bob.getId());
        });

        assertThat(updated).isZero();
    }
}
