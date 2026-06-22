package com.marketfit.post.infrastructure.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.ConstructorBinding;

@ConfigurationProperties(prefix = "app.post.crawling")
public record PostCrawlingProperties(
        String defaultUrl,
        List<String> seedUrls,
        int timeoutSeconds,
        int articleDelayMillis,
        int maxInputCharacters
) {
    public PostCrawlingProperties(String defaultUrl, int timeoutSeconds) {
        this(defaultUrl, List.of(), timeoutSeconds, 300, 12_000);
    }

    public PostCrawlingProperties(
            String defaultUrl,
            int timeoutSeconds,
            int articleDelayMillis,
            int maxInputCharacters
    ) {
        this(defaultUrl, List.of(), timeoutSeconds, articleDelayMillis, maxInputCharacters);
    }

    @ConstructorBinding
    public PostCrawlingProperties {
        seedUrls = seedUrls == null ? List.of() : List.copyOf(seedUrls);
        timeoutSeconds = timeoutSeconds <= 0 ? 10 : timeoutSeconds;
        articleDelayMillis = Math.max(0, articleDelayMillis);
        maxInputCharacters = maxInputCharacters <= 0 ? 12_000 : maxInputCharacters;
    }
}
