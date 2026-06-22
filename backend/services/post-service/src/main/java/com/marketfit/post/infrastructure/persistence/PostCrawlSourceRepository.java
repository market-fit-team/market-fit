package com.marketfit.post.infrastructure.persistence;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.marketfit.post.core.crawling.PostCrawlSource;

public interface PostCrawlSourceRepository extends JpaRepository<PostCrawlSource, UUID> {
}
