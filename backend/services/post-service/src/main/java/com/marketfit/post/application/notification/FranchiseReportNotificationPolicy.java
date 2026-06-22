package com.marketfit.post.application.notification;

import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Component;

import com.marketfit.post.core.llm.PostLlmSummaryStatus;
import com.marketfit.post.core.post.PostSourceType;
import com.marketfit.post.core.post.PostStatus;

@Component
public class FranchiseReportNotificationPolicy {

    private static final double MIN_RELEVANCE_SCORE = 0.2;
    private static final List<String> FRANCHISE_KEYWORDS = List.of(
            "프랜차이즈", "가맹점", "가맹본부", "가맹사업", "가맹", "브랜드 창업",
            "외식 프랜차이즈", "창업 아이템", "점포 창업", "매장 창업"
    );

    public boolean isEligible(
            List<String> matchedKeywords,
            int matchedParagraphCount,
            double relevanceScore,
            PostSourceType sourceType,
            PostStatus postStatus,
            PostLlmSummaryStatus llmStatus
    ) {
        return sourceType == PostSourceType.LLM_REPORT
                && postStatus == PostStatus.PUBLISHED
                && llmStatus == PostLlmSummaryStatus.SUMMARIZED
                && matchedParagraphCount >= 1
                && relevanceScore >= MIN_RELEVANCE_SCORE
                && containsFranchiseKeyword(matchedKeywords);
    }

    private boolean containsFranchiseKeyword(List<String> matchedKeywords) {
        if (matchedKeywords == null) {
            return false;
        }
        return matchedKeywords.stream()
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .anyMatch(keyword -> FRANCHISE_KEYWORDS.stream().anyMatch(keyword::contains));
    }
}
