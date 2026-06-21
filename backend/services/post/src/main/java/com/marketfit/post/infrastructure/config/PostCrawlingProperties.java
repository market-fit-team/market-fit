package com.marketfit.post.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.post.crawling")
public record PostCrawlingProperties(
        String defaultUrl,
        int timeoutSeconds
) {
    public PostCrawlingProperties {
        timeoutSeconds = timeoutSeconds <= 0 ? 10 : timeoutSeconds;
    }
}
