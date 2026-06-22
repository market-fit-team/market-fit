package com.marketfit.post.api.post.dto;

import com.marketfit.post.core.post.PostCategory;
import com.marketfit.post.core.post.PostStatus;
import com.marketfit.post.core.post.PostVisibility;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PostWriteRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(max = 500) String summary,
        @NotBlank @Size(max = 20_000) String content,
        @NotNull PostCategory category,
        @Min(1) @Max(120) int readTimeMinutes,
        @Size(max = 2_000) String thumbnailUrl,
        PostStatus status,
        PostVisibility visibility
) {
}
