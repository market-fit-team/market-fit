package com.marketfit.post.core.llm;

import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.post.PostCategory;

public record LlmReportRequest(
        CrawledDocument document,
        PostCategory requestedCategory
) {
}
