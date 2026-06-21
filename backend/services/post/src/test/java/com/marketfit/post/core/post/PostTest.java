package com.marketfit.post.core.post;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PostTest {

    @Test
    void 게시글을_생성하고_수정한다() {
        Post post = Post.create(
                "user-1",
                "테스터",
                PostDraft.manual("첫 제목", "첫 요약", "첫 내용", PostCategory.TREND, 5)
        );

        post.update("수정 제목", "수정 요약", "수정 내용", PostCategory.GUIDE, 7);

        assertThat(post.getTitle()).isEqualTo("수정 제목");
        assertThat(post.getCategory()).isEqualTo(PostCategory.GUIDE);
        assertThat(post.isWrittenBy("user-1")).isTrue();
    }

    @Test
    void 삭제는_멱등적이다() {
        Post post = Post.create(
                "user-1",
                "테스터",
                PostDraft.manual("제목", "요약", "내용", PostCategory.POLICY, 3)
        );

        post.delete();
        var deletedAt = post.getDeletedAt();
        post.delete();

        assertThat(post.getDeletedAt()).isEqualTo(deletedAt);
    }
}
