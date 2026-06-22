package com.marketfit.post.infrastructure.crawling;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Component;

import com.marketfit.post.core.crawling.CrawledDocument;

@Component
public class CommerceParagraphFilter {

    public static final String NO_RELEVANT_CONTENT =
            "상가·창업·프랜차이즈 관련 내용을 찾을 수 없습니다.";

    private static final List<String> INTEREST = List.of(
            "상가", "상권", "창업", "예비창업", "소상공인", "자영업", "프랜차이즈", "가맹점",
            "가맹본부", "점포", "매장", "입점", "폐점", "공실", "임대료", "권리금", "유동인구",
            "배후수요", "소비트렌드", "소비 트렌드", "f&b", "카페", "음식점", "외식업",
            "무인매장", "팝업스토어", "로드숍", "골목상권", "역세권", "오피스상권",
            "대학가상권", "주거상권"
    );
    private static final List<String> EXCLUDE = List.of(
            "정치", "연예", "스포츠", "주식", "코인", "국제분쟁", "사건사고", "범죄", "날씨",
            "아파트 청약", "분양 광고", "투자 광고"
    );

    public FilteredArticle filter(CrawledDocument document, String keyword) {
        List<String> paragraphs = document.paragraphs();
        var selectedIndexes = new LinkedHashSet<Integer>();
        var matchedKeywords = new LinkedHashSet<String>();
        var excludedKeywords = new LinkedHashSet<String>();
        String metadata = String.join(" ", safe(document.title()), safe(document.metaDescription()),
                safe(document.ogTitle()), safe(document.ogDescription()), safe(keyword)).toLowerCase(Locale.ROOT);
        INTEREST.stream().filter(metadata::contains).forEach(matchedKeywords::add);

        for (int index = 0; index < paragraphs.size(); index++) {
            String lower = paragraphs.get(index).toLowerCase(Locale.ROOT);
            List<String> interests = INTEREST.stream().filter(lower::contains).toList();
            List<String> exclusions = EXCLUDE.stream().filter(lower::contains).toList();
            excludedKeywords.addAll(exclusions);
            if (!interests.isEmpty() && (exclusions.isEmpty() || interests.size() >= exclusions.size())) {
                matchedKeywords.addAll(interests);
                selectedIndexes.add(Math.max(0, index - 1));
                selectedIndexes.add(index);
                selectedIndexes.add(Math.min(paragraphs.size() - 1, index + 1));
            }
        }
        List<String> selected = selectedIndexes.stream()
                .filter(index -> index >= 0 && index < paragraphs.size())
                .map(paragraphs::get)
                .distinct()
                .toList();
        if (selected.isEmpty() && !matchedKeywords.isEmpty() && !paragraphs.isEmpty()) {
            selected = paragraphs.stream().limit(3).toList();
        }
        double relevance = paragraphs.isEmpty()
                ? 0
                : Math.min(1.0, selected.size() / (double) paragraphs.size()
                        + Math.min(0.25, matchedKeywords.size() * 0.03)
                        - Math.min(0.2, excludedKeywords.size() * 0.03));
        return new FilteredArticle(
                selected,
                List.copyOf(matchedKeywords),
                List.copyOf(excludedKeywords),
                Math.max(0, relevance)
        );
    }

    public boolean hasInterestKeyword(String content, String keyword) {
        String target = (safe(content) + " " + safe(keyword)).toLowerCase(Locale.ROOT);
        return INTEREST.stream().anyMatch(target::contains);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    public record FilteredArticle(
            List<String> paragraphs,
            List<String> matchedKeywords,
            List<String> excludedKeywords,
            double relevanceScore
    ) {
    }
}
