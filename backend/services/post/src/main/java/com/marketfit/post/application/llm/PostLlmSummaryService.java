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
                입력 텍스트를 한국어로 요약한다.
                입력에 없는 사실을 만들지 않는다.
                제목은 50자 이내로 생성한다.
                summary는 2~3문장으로 생성한다.
                content는 반드시 아래 Markdown 보고서 형식을 따른다.

                # 제목

                ## 핵심 요약
                - 요약 bullet 1
                - 요약 bullet 2
                - 요약 bullet 3

                ## 상세 분석
                본문 요약 설명

                ## 시사점
                사용자가 참고할 만한 인사이트

                가능하면 title, summary, content를 JSON 객체로 반환한다.
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
