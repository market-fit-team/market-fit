package com.marketfit.post.core.post;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "posts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post {

    @Id
    private UUID id;

    @Column(name = "author_id", nullable = false, length = 200)
    private String authorId;

    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    @Column(name = "user_id", nullable = false, length = 200)
    private String userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "thumbnail_url", length = 2_000)
    private String thumbnailUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostCategory category;

    @Column(name = "read_time_minutes", nullable = false)
    private int readTimeMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private PostSourceType sourceType;

    @Column(name = "source_url", length = 2_000)
    private String sourceUrl;

    @Column(name = "source_title", length = 300)
    private String sourceTitle;

    @Column(name = "collected_at")
    private Instant collectedAt;

    @Column(name = "llm_provider", length = 100)
    private String llmProvider;

    @Column(name = "source_id")
    private UUID sourceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostVisibility visibility;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public static Post create(
            String authorId,
            String authorName,
            PostDraft draft
    ) {
        Post post = new Post();
        post.id = UUID.randomUUID();
        post.authorId = authorId;
        post.authorName = authorName;
        post.userId = authorId;
        post.status = PostStatus.PUBLISHED;
        post.visibility = PostVisibility.PUBLIC;
        post.sourceType = draft.sourceType();
        post.sourceUrl = draft.sourceUrl();
        post.sourceTitle = draft.sourceTitle();
        post.collectedAt = draft.collectedAt();
        post.llmProvider = draft.llmProvider();
        post.update(
                draft.title(),
                draft.summary(),
                draft.content(),
                draft.category(),
                draft.readTimeMinutes()
        );
        post.publishedAt = Instant.now();
        return post;
    }

    public void configureCrawlSource(UUID sourceId, PostVisibility visibility) {
        this.sourceId = sourceId;
        this.sourceType = PostSourceType.LLM_REPORT;
        this.status = PostStatus.PUBLISHED;
        this.visibility = visibility;
    }

    public void configureManualPublication(
            String thumbnailUrl,
            PostStatus status,
            PostVisibility visibility
    ) {
        this.thumbnailUrl = normalizeNullable(thumbnailUrl);
        this.status = status == null ? PostStatus.DRAFT : status;
        this.visibility = visibility == null ? PostVisibility.PRIVATE : visibility;
    }

    public void updateManualPublication(
            String thumbnailUrl,
            PostStatus status,
            PostVisibility visibility
    ) {
        this.thumbnailUrl = normalizeNullable(thumbnailUrl);
        if (status != null) {
            this.status = status;
        }
        if (visibility != null) {
            this.visibility = visibility;
        }
    }

    public void update(
            String title,
            String summary,
            String content,
            PostCategory category,
            int readTimeMinutes
    ) {
        this.title = title.trim();
        this.summary = summary.trim();
        this.content = content.trim();
        this.category = category;
        this.readTimeMinutes = readTimeMinutes;
    }

    public void delete() {
        if (deletedAt == null) {
            deletedAt = Instant.now();
        }
    }

    public boolean isWrittenBy(String userId) {
        return authorId.equals(userId);
    }

    private String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }
}
