package com.marketfit.post.infrastructure.llm;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.marketfit.post.core.crawling.CrawledDocument;
import com.marketfit.post.core.llm.LlmReportRequest;
import com.marketfit.post.core.post.PostCategory;

class MockLlmReportSummarizerTest {

    private final MockLlmReportSummarizer summarizer = new MockLlmReportSummarizer();

    @Test
    void 요청_카테고리와_출처_제목을_우선한다() {
        var result = summarizer.summarize(new LlmReportRequest(
                new CrawledDocument(
                        "https://example.com",
                        "수집된 기사 제목",
                        "수집된 기사 설명",
                        "첫 문장입니다. 두 번째 문장입니다. 세 번째 문장입니다.",
                        Instant.now()
                ),
                PostCategory.POLICY
        ), "prompt");

        assertThat(result.title()).isEqualTo("수집된 기사 제목");
        assertThat(result.provider()).isEqualTo("MOCK");
        assertThat(result.model()).isEqualTo("mock-v1");
        assertThat(result.content()).contains(
                "# 수집된 기사 제목",
                "## 핵심 요약",
                "## 창업 기회",
                "## 주의할 점"
        );
    }

    @Test
    void 카테고리가_없으면_본문_키워드로_추론한다() {
        var result = summarizer.summarize(new LlmReportRequest(
                new CrawledDocument(
                        null,
                        null,
                        null,
                        "정책 지원금과 인허가 변경 내용입니다.",
                        Instant.now()
                ),
                null
        ), "prompt");

        assertThat(result.summary()).hasSizeGreaterThan(30);
    }
}
