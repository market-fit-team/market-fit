package com.marketfit.post.core.llm;

public interface PostLlmProvider {

    LlmSummaryResult summarize(LlmReportRequest request, String prompt);
}
