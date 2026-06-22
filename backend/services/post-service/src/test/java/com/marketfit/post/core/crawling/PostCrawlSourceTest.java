package com.marketfit.post.core.crawling;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class PostCrawlSourceTest {

    @Test
    void 원문과_PostId를_크롤링_메타데이터에_보존한다() {
        PostCrawlSource source = PostCrawlSource.requested(
                "https://example.com/article",
                "AI 채용",
                "직접 입력한 원문"
        );
        UUID postId = UUID.randomUUID();
        Instant crawledAt = Instant.parse("2026-06-21T01:00:00Z");

        source.markCrawled(
                "https://example.com/article",
                "기사 제목",
                "직접 입력한 원문",
                crawledAt
        );
        source.linkPost(postId);

        assertThat(source.getRawContent()).isEqualTo("직접 입력한 원문");
        assertThat(source.getPostId()).isEqualTo(postId);
        assertThat(source.getStatus()).isEqualTo(PostCrawlStatus.CRAWLED);
        assertThat(source.getCrawledAt()).isEqualTo(crawledAt);
    }
}
