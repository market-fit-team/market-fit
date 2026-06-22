package com.marketfit.post.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.post.llm")
public record PostLlmProperties(
        String provider,
        String apiKey,
        String model,
        int timeoutSeconds
) {
    public PostLlmProperties {
        provider = hasText(provider) ? provider.trim().toUpperCase() : "OPENAI";
        model = hasText(model) ? model.trim() : "gpt-4o-mini";
        timeoutSeconds = timeoutSeconds <= 0 ? 30 : timeoutSeconds;
    }

    public boolean hasUsableOpenAiApiKey() {
        return hasText(apiKey) && !"CHANGE_ME".equalsIgnoreCase(apiKey.trim());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
