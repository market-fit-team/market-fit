package com.marketfit.post.core.llm;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;

import org.junit.jupiter.api.Test;

class PostLlmSummaryTest {

    @Test
    void 성공하면_provider_model_status와_tokenUsage를_저장한다() {
        PostLlmSummary summary = PostLlmSummary.requested(
                "OPENAI",
                "gpt-4o-mini",
                "테스트 prompt"
        );

        summary.markSummarized(new LlmSummaryResult(
                "제목",
                "요약",
                "본문",
                "OPENAI",
                "gpt-4o-mini",
                Map.of("totalTokens", 120)
        ));

        assertThat(summary.getProvider()).isEqualTo("OPENAI");
        assertThat(summary.getModel()).isEqualTo("gpt-4o-mini");
        assertThat(summary.getStatus()).isEqualTo(PostLlmSummaryStatus.SUMMARIZED);
        assertThat(summary.getTokenUsage()).containsEntry("totalTokens", 120);
    }

    @Test
    void 실패하면_FAILED와_errorMessage를_저장한다() {
        PostLlmSummary summary = PostLlmSummary.requested(
                "OPENAI",
                "gpt-4o-mini",
                "테스트 prompt"
        );

        summary.markFailed("OpenAI 호출 실패");

        assertThat(summary.getStatus()).isEqualTo(PostLlmSummaryStatus.FAILED);
        assertThat(summary.getErrorMessage()).isEqualTo("OpenAI 호출 실패");
    }
}
