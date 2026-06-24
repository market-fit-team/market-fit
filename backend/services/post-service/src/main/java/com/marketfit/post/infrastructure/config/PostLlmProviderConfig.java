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
        boolean openAiApiKeyPresent = properties.hasUsableOpenAiApiKey();
        log.info(
                "[PostLLM] provider={}, model={}, openaiApiKeyPresent={}",
                properties.provider(),
                properties.model(),
                openAiApiKeyPresent
        );
        if ("OPENAI".equals(properties.provider()) && openAiApiKeyPresent) {
            return new OpenAiLlmReportSummarizer(objectMapper, properties);
        }
        log.info("[PostLLM] Using Mock provider.");
        return new MockLlmReportSummarizer();
    }
}
