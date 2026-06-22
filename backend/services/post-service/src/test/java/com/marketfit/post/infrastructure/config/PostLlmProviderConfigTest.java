package com.marketfit.post.infrastructure.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketfit.post.infrastructure.llm.MockLlmReportSummarizer;
import com.marketfit.post.infrastructure.llm.OpenAiLlmReportSummarizer;

class PostLlmProviderConfigTest {

    private final PostLlmProviderConfig config = new PostLlmProviderConfig();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void OPENAI_API_KEY가_있으면_OpenAI_provider를_선택한다() {
        var provider = config.postLlmProvider(
                objectMapper,
                new PostLlmProperties("OPENAI", "test-key", null, 0)
        );

        assertThat(provider).isInstanceOf(OpenAiLlmReportSummarizer.class);
    }

    @Test
    void OPENAI_API_KEY가_없으면_Mock_provider로_fallback한다() {
        var provider = config.postLlmProvider(
                objectMapper,
                new PostLlmProperties("OPENAI", "", null, 0)
        );

        assertThat(provider).isInstanceOf(MockLlmReportSummarizer.class);
    }

    @Test
    void OPENAI_API_KEY가_CHANGE_ME이면_Mock_provider로_fallback한다() {
        var provider = config.postLlmProvider(
                objectMapper,
                new PostLlmProperties("OPENAI", " CHANGE_ME ", null, 0)
        );

        assertThat(provider).isInstanceOf(MockLlmReportSummarizer.class);
    }
}
