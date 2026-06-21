package com.marketfit.post.api.post.dto;

import com.marketfit.post.core.post.PostVisibility;

import jakarta.validation.constraints.Size;

public record CrawlSummaryRequest(
        @Size(max = 2_000) String url,
        @Size(max = 500) String keyword,
        @Size(max = 100_000) String rawContent,
        PostVisibility visibility
) {
}
