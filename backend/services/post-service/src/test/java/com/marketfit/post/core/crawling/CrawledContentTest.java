package com.marketfit.post.core.crawling;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class CrawledContentTest {

    @Test
    void LLM_입력은_최대_12000자로_제한한다() {
        CrawledContent content = new CrawledContent(
                UUID.randomUUID(),
                "https://example.com",
                null,
                "제목",
                "설명",
                "가".repeat(50_000),
                Instant.now()
        );

        assertThat(content.toLlmDocument().rawContent()).hasSize(12_000);
    }
}
