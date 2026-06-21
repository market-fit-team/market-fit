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
            log.info("Selected post LLM provider=OPENAI, model={}", properties.model());
            return new OpenAiLlmReportSummarizer(objectMapper, properties);
        }
        log.info(
                "Selected post LLM provider=MOCK, configuredProvider={}, usableOpenAiApiKey={}",
                properties.provider(),
                properties.hasUsableOpenAiApiKey()
        );
        return new MockLlmReportSummarizer();
    }
}
