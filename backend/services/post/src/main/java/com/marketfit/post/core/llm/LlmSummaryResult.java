package com.marketfit.post.core.llm;

import java.util.Map;

public record LlmSummaryResult(
        String title,
        String summary,
        String content,
        String provider,
        String model,
        Map<String, Integer> tokenUsage
) {
    public LlmSummaryResult {
        tokenUsage = tokenUsage == null ? Map.of() : Map.copyOf(tokenUsage);
    }
}
