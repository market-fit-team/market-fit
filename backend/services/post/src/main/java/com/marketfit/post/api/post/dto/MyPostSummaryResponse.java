package com.marketfit.post.api.post.dto;

import java.util.List;

public record MyPostSummaryResponse(
        long totalCount,
        long publishedThisMonth,
        long llmReportCount,
        List<PostSummaryResponse> recentPosts
) {
}
