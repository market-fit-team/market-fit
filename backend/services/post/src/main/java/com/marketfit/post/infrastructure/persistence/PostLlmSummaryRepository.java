package com.marketfit.post.infrastructure.persistence;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.marketfit.post.core.llm.PostLlmSummary;

public interface PostLlmSummaryRepository extends JpaRepository<PostLlmSummary, UUID> {
}
