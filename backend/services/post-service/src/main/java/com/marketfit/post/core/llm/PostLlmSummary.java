package com.marketfit.post.core.llm;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
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
@Table(name = "post_llm_summaries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostLlmSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "post_id")
    private UUID postId;

    @Column(nullable = false, length = 100)
    private String provider;

    @Column(nullable = false, length = 200)
    private String model;

    @Column(nullable = false, columnDefinition = "text")
    private String prompt;

    @Column(columnDefinition = "text")
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "token_usage", columnDefinition = "jsonb")
    private Map<String, Integer> tokenUsage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PostLlmSummaryStatus status;

    @Column(name = "error_message", columnDefinition = "text")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static PostLlmSummary requested(
            String provider,
            String model,
            String prompt
    ) {
        PostLlmSummary record = new PostLlmSummary();
        record.provider = provider;
        record.model = model;
        record.prompt = prompt;
        record.status = PostLlmSummaryStatus.REQUESTED;
        return record;
    }

    public void markSummarized(LlmSummaryResult result) {
        provider = result.provider();
        model = result.model();
        summary = result.summary();
        tokenUsage = new LinkedHashMap<>(result.tokenUsage());
        status = PostLlmSummaryStatus.SUMMARIZED;
        errorMessage = null;
    }

    public void markFailed(String errorMessage) {
        status = PostLlmSummaryStatus.FAILED;
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
