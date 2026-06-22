package com.marketfit.post.infrastructure.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.marketfit.post.core.llm.PostLlmProvider;
import com.marketfit.post.infrastructure.llm.MockLlmReportSummarizer;
import com.marketfit.post.infrastructure.llm.OpenAiLlmReportSummarizer;

import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class PostLlmProviderConfig {

    @Bean
    PostLlmProvider postLlmProvider(
            ObjectMapper objectMapper,
            PostLlmProperties properties
    ) {
        if ("OPENAI".equals(properties.provider()) && properties.hasUsableOpenAiApiKey()) {
            log.info(
                    "[PostLLM] OPENAI_API_KEY detected ({}). Using OpenAI provider. model={}",
                    mask(properties.apiKey()),
                    properties.model()
            );
            return new OpenAiLlmReportSummarizer(objectMapper, properties);
        }
        log.info("[PostLLM] OPENAI_API_KEY missing or placeholder. Using Mock provider.");
        return new MockLlmReportSummarizer();
    }

    private String mask(String apiKey) {
        String trimmed = apiKey == null ? "" : apiKey.trim();
        if (trimmed.length() <= 4) {
            return "****";
        }
        return trimmed.substring(0, Math.min(3, trimmed.length()))
                + "-****"
                + trimmed.substring(trimmed.length() - 4);
    }
}
