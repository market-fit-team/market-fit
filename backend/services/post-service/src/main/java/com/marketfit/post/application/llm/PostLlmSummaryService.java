package com.marketfit.post.application.llm;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.marketfit.post.core.llm.LlmReportRequest;
import com.marketfit.post.core.llm.LlmSummaryResult;
import com.marketfit.post.core.llm.PostLlmProvider;
import com.marketfit.post.core.llm.PostLlmSummary;
import com.marketfit.post.infrastructure.config.PostLlmProperties;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PostLlmSummaryService {

    private static final int MAX_ERROR_MESSAGE_LENGTH = 1_000;

    private final PostLlmProvider provider;
    private final PostLlmSummaryStore summaryStore;
    private final PostLlmProperties properties;

    public SummaryExecution summarize(LlmReportRequest request) {
        String prompt = buildPrompt();
        PostLlmSummary record = summaryStore.createRequested(
                properties.provider(),
                properties.model(),
                prompt
        );

        try {
            LlmSummaryResult result = provider.summarize(request, prompt);
            summaryStore.markSummarized(record.getId(), result);
            return new SummaryExecution(record.getId(), result);
        } catch (RuntimeException exception) {
            saveFailure(record.getId(), exception);
            throw exception;
        }
    }

    public void linkPost(SummaryExecution execution, UUID postId) {
        summaryStore.linkPost(execution.summaryId(), postId);
    }

    private String buildPrompt() {
        return """
                너는 뉴스 기반 창업 상권 AI 리포트를 작성하는 전문가다.
                여러 기사에서 추출한 내용만 근거로 상권, 상가, 업종, 프랜차이즈,
                소비 트렌드와 리스크를 분석한다. 입력에 없는 지역, 수치, 브랜드를 만들지 않는다.
                단정적인 투자 추천이나 성공 보장 표현을 사용하지 않는다.

                한국어 JSON 객체로 title, summary, content를 반환한다.
                title은 30자 이내다.
                summary는 반드시 3문장 이상이며 상권/상가, 창업/프랜차이즈,
                리스크/주의점 관점의 문장을 각각 하나 이상 포함한다.
                content는 500~900자 정도의 Markdown 리포트다.

                # 제목
                ## 핵심 요약
                - 상가/상권 관점
                - 창업/프랜차이즈 관점
                - 리스크 관점
                ## 창업 기회
                ## 주의할 점
                ## 추천 검토 방향

                불확실한 내용은 "가능성이 있습니다", "검토할 만합니다"처럼 표현한다.
                """;
    }

    private void saveFailure(UUID id, RuntimeException exception) {
        try {
            summaryStore.markFailed(id, safeErrorMessage(exception));
        } catch (RuntimeException persistenceException) {
            exception.addSuppressed(persistenceException);
        }
    }

    private String safeErrorMessage(RuntimeException exception) {
        String message = exception instanceof ResponseStatusException responseException
                ? responseException.getReason()
                : exception.getMessage();
        String safeMessage = message == null || message.isBlank()
                ? "LLM 요약 처리에 실패했습니다."
                : message.trim();
        return safeMessage.length() <= MAX_ERROR_MESSAGE_LENGTH
                ? safeMessage
                : safeMessage.substring(0, MAX_ERROR_MESSAGE_LENGTH);
    }

    public record SummaryExecution(
            UUID summaryId,
            LlmSummaryResult result
    ) {
    }
}
