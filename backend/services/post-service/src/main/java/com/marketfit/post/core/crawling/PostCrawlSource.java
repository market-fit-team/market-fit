package com.marketfit.post.core.crawling;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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
    @Column(name = "input_url_type", length = 30)
    private InputUrlType inputUrlType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "discovered_article_urls", columnDefinition = "jsonb")
    private List<String> discoveredArticleUrls;

    @Column(name = "crawled_article_count")
    private int crawledArticleCount;

    @Column(name = "skipped_article_count")
    private int skippedArticleCount;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "matched_keywords", columnDefinition = "jsonb")
    private List<String> matchedKeywords;

    @Column(name = "matched_paragraph_count")
    private int matchedParagraphCount;

    @Column(name = "total_paragraph_count")
    private int totalParagraphCount;

    @Column(name = "relevance_score")
    private double relevanceScore;

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

    public void markCrawled(CrawledContent content) {
        markCrawled(content.sourceUrl(), content.title(), content.bodyText(), content.crawledAt());
        inputUrlType = content.inputUrlType();
        discoveredArticleUrls = new ArrayList<>(content.discoveredArticleUrls());
        crawledArticleCount = content.crawledArticleCount();
        skippedArticleCount = content.skippedArticleCount();
        matchedKeywords = new ArrayList<>(content.matchedKeywords());
        matchedParagraphCount = content.matchedParagraphCount();
        totalParagraphCount = content.totalParagraphCount();
        relevanceScore = content.relevanceScore();
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
