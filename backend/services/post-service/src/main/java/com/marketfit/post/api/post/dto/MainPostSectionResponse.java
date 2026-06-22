package com.marketfit.post.api.post.dto;

import java.util.List;

import com.marketfit.post.core.post.PostCategory;

public record MainPostSectionResponse(
        String id,
        String title,
        String description,
        PostCategory category,
        List<PostSummaryResponse> posts
) {
}
