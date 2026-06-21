package com.marketfit.post.infrastructure.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostDraft;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostVisibility;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:post-repository;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
class PostRepositoryTest {

    @Autowired
    private PostRepository repository;

    @Test
    void 메인_조회는_PUBLIC_PUBLISHED_미삭제_Post만_반환하고_limit을_적용한다() {
        Post olderPublic = post("공개 이전", PostVisibility.PUBLIC, PostStatus.PUBLISHED, null);
        Post newerPublic = post("공개 최신", PostVisibility.PUBLIC, PostStatus.PUBLISHED, null);
        Post privatePost = post("비공개", PostVisibility.PRIVATE, PostStatus.PUBLISHED, null);
        Post draftPost = post("초안", PostVisibility.PUBLIC, PostStatus.DRAFT, null);
        Post deletedPost = post(
                "삭제",
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED,
                Instant.parse("2026-06-21T02:00:00Z")
        );
        repository.saveAll(List.of(
                olderPublic,
                newerPublic,
                privatePost,
                draftPost,
                deletedPost
        ));
        repository.flush();

        List<Post> filtered = repository.findByVisibilityAndStatusAndDeletedAtIsNull(
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<Post> limited = repository.findByVisibilityAndStatusAndDeletedAtIsNull(
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED,
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        assertThat(filtered)
                .extracting(Post::getTitle)
                .containsExactlyInAnyOrder("공개 이전", "공개 최신");
        assertThat(limited).hasSize(1);
    }

    private Post post(
            String title,
            PostVisibility visibility,
            PostStatus status,
            Instant deletedAt
    ) {
        Post post = Post.create(
                "user-1",
                "테스터",
                new PostDraft(
                        title,
                        "요약",
                        "본문",
                        PostCategory.TREND,
                        1,
                        PostSourceType.LLM_REPORT,
                        null,
                        null,
                        null,
                        "OPENAI:gpt-4o-mini"
                )
        );
        post.configureCrawlSource(null, visibility);
        ReflectionTestUtils.setField(post, "status", status);
        ReflectionTestUtils.setField(post, "deletedAt", deletedAt);
        return post;
    }

}
