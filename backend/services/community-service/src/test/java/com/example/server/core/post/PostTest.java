package com.example.server.core.post;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.example.server.core.user.User;

class PostTest {

    @Test
    void 작성자_id가_같으면_true를_반환한다() {
        User user = User.createExternalUser(
                "authentik",
                "authentik-user-alice",
                "alice@example.com",
                true,
                "Alice",
                null
        );
        ReflectionTestUtils.setField(user, "id", 1L);

        Post post = Post.createRoot("테스트 글", user);

        assertThat(post.isWrittenBy(1L)).isTrue();
        assertThat(post.isWrittenBy(2L)).isFalse();
    }
}
