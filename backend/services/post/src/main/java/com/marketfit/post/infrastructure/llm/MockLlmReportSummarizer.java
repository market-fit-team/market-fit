package com.marketfit.post.infrastructure.llm;

import java.util.Arrays;

import com.marketfit.post.core.llm.LlmReportRequest;
import com.marketfit.post.core.llm.LlmSummaryResult;
import com.marketfit.post.core.llm.PostLlmProvider;

public class MockLlmReportSummarizer implements PostLlmProvider {

    private static final int TITLE_LIMIT = 50;
    private static final int SUMMARY_LIMIT = 240;

    @Override
    public LlmSummaryResult summarize(LlmReportRequest request, String prompt) {
        String normalized = request.document().rawContent().replaceAll("\\s+", " ").trim();
        String sourceTitle = request.document().title();
        String title = hasText(sourceTitle)
                ? limit(sourceTitle, TITLE_LIMIT)
                : limit(firstSentence(normalized), TITLE_LIMIT);
        String summary = limit(firstSentences(normalized, 3), SUMMARY_LIMIT);
        String content = """
                # %s

                ## 핵심 요약
                - %s
                - 원문의 주요 흐름을 한국어로 정리했습니다.
                - 세부 내용은 아래 분석을 참고하세요.

                ## 상세 분석
                %s

                ## 시사점
                원문의 핵심 내용을 실제 의사결정 전에 출처와 함께 확인하세요.
                """.formatted(title, summary, normalized).trim();

        return new LlmSummaryResult(
                title.isBlank() ? "수집 콘텐츠 요약 리포트" : title,
                summary,
                content,
                "MOCK",
                "mock-v1",
                java.util.Map.of()
        );
    }

    private String firstSentence(String content) {
        String[] sentences = content.split("(?<=[.!?。])\\s+");
        return sentences.length == 0 ? content : sentences[0];
    }

    private String firstSentences(String content, int count) {
        String[] sentences = content.split("(?<=[.!?。])\\s+");
        return String.join(" ", Arrays.copyOfRange(sentences, 0, Math.min(count, sentences.length)));
    }

    private String limit(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength - 1).trim() + "…";
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
