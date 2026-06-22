package com.marketfit.post.api.report.dto;

import com.marketfit.post.core.post.PostCategory;

import jakarta.validation.constraints.Size;

public record CreateLlmReportRequest(
        @Size(max = 2_000) String url,
        @Size(max = 100_000) String rawContent,
        PostCategory category
) {
}
