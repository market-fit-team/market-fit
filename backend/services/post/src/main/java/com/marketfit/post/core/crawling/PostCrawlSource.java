package com.marketfit.post.core.crawling;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "post_crawl_sources")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostCrawlSource {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "post_id")
    private UUID postId;

    @Column(length = 2_000)
    private String url;

    @Column(length = 500)
    private String keyword;

    @Column(name = "raw_content", columnDefinition = "text")
    private String rawContent;

    @Column(name = "extracted_title", length = 500)
    private String extractedTitle;

    @Column(name = "crawled_at")
    private Instant crawledAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostCrawlStatus status;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static PostCrawlSource requested(String url, String keyword, String rawContent) {
        PostCrawlSource source = new PostCrawlSource();
        source.url = url;
        source.keyword = keyword;
        source.rawContent = rawContent;
        source.status = PostCrawlStatus.REQUESTED;
        return source;
    }

    public void markCrawled(
            String finalUrl,
            String extractedTitle,
            String rawContent,
            Instant crawledAt
    ) {
        this.url = finalUrl;
        this.extractedTitle = extractedTitle;
        this.rawContent = rawContent;
        this.crawledAt = crawledAt;
        this.status = PostCrawlStatus.CRAWLED;
        this.errorMessage = null;
    }

    public void markFailed(String errorMessage) {
        this.status = PostCrawlStatus.FAILED;
        this.errorMessage = errorMessage;
    }

    public void linkPost(UUID postId) {
        this.postId = postId;
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
