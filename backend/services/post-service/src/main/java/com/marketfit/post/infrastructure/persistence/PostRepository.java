package com.marketfit.post.infrastructure.persistence;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.marketfit.post.core.post.Post;
import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostVisibility;

public interface PostRepository extends JpaRepository<Post, UUID> {

    Optional<Post> findByIdAndDeletedAtIsNull(UUID id);

    Page<Post> findByDeletedAtIsNull(Pageable pageable);

    Page<Post> findByVisibilityAndStatusAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(
            PostVisibility visibility,
            PostStatus status,
            Pageable pageable
    );

    List<Post> findByVisibilityAndStatusAndDeletedAtIsNull(
            PostVisibility visibility,
            PostStatus status,
            Pageable pageable
    );

    List<Post> findTop6ByCategoryAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(PostCategory category);

    List<Post> findTop6ByCategoryAndSourceTypeAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(
            PostCategory category,
            PostSourceType sourceType
    );

    List<Post> findTop5ByAuthorIdAndDeletedAtIsNullOrderByPublishedAtDescIdDesc(String authorId);

    long countByAuthorIdAndDeletedAtIsNull(String authorId);

    long countByAuthorIdAndDeletedAtIsNullAndPublishedAtAfter(String authorId, Instant publishedAfter);

    long countByAuthorIdAndSourceTypeAndDeletedAtIsNull(String authorId, PostSourceType sourceType);
}
