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
        Post manualPost = post("일반 게시글", PostVisibility.PUBLIC, PostStatus.PUBLISHED, null);
        ReflectionTestUtils.setField(manualPost, "sourceType", PostSourceType.MANUAL);
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
                manualPost,
                deletedPost
        ));
        repository.flush();

        List<Post> filtered = repository.findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED,
                PostSourceType.LLM_REPORT,
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<Post> limited = repository.findByVisibilityAndStatusAndSourceTypeAndDeletedAtIsNull(
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED,
                PostSourceType.LLM_REPORT,
                PageRequest.of(0, 1, Sort.by(Sort.Direction.DESC, "createdAt"))
        );

        assertThat(filtered)
                .extracting(Post::getTitle)
                .containsExactlyInAnyOrder("공개 이전", "공개 최신");
        assertThat(limited).hasSize(1);
    }

    @Test
    void 메인_캐러셀은_PUBLIC_PUBLISHED_미삭제_LLM_REPORT만_반환한다() {
        Post publicReport = post("공개 리포트", PostVisibility.PUBLIC, PostStatus.PUBLISHED, null);
        Post privateReport = post("비공개 리포트", PostVisibility.PRIVATE, PostStatus.PUBLISHED, null);
        Post draftReport = post("초안 리포트", PostVisibility.PUBLIC, PostStatus.DRAFT, null);
        Post deletedReport = post(
                "삭제 리포트",
                PostVisibility.PUBLIC,
                PostStatus.PUBLISHED,
                Instant.parse("2026-06-21T02:00:00Z")
        );
        Post manualPost = post("일반 게시글", PostVisibility.PUBLIC, PostStatus.PUBLISHED, null);
        ReflectionTestUtils.setField(manualPost, "sourceType", PostSourceType.MANUAL);
        repository.saveAll(List.of(
                publicReport,
                privateReport,
                draftReport,
                deletedReport,
                manualPost
        ));
        repository.flush();

        List<Post> result =
                repository.findTop6ByCategoryAndSourceTypeAndVisibilityAndStatusAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(
                        PostCategory.TREND,
                        PostSourceType.LLM_REPORT,
                        PostVisibility.PUBLIC,
                        PostStatus.PUBLISHED
                );

        assertThat(result)
                .extracting(Post::getTitle)
                .containsExactly("공개 리포트");
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
