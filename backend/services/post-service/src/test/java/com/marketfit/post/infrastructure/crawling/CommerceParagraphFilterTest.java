package com.marketfit.post.infrastructure.crawling;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.marketfit.post.core.crawling.CrawledDocument;

class CommerceParagraphFilterTest {

    private final CommerceParagraphFilter filter = new CommerceParagraphFilter();

    @Test
    void 관련_문단과_앞뒤_문단을_포함하고_키워드와_관련도를_계산한다() {
        CrawledDocument document = new CrawledDocument(
                "https://news.example.com/article/1",
                "프랜차이즈 창업 시장",
                "가맹점 확대 뉴스",
                "프랜차이즈 창업 시장",
                "상권과 임대료 변화",
                "article",
                List.of(
                        "첫 번째 문단은 기사 배경을 설명하기 위한 충분히 긴 문장입니다.",
                        "프랜차이즈 가맹점 창업은 상권 유동인구와 임대료를 함께 검토해야 합니다.",
                        "마지막 문단은 운영 위험을 설명하기 위한 충분히 긴 문장입니다."
                ),
                "본문",
                Instant.now()
        );

        var result = filter.filter(document, "프랜차이즈 창업");

        assertThat(result.paragraphs()).hasSize(3);
        assertThat(result.matchedKeywords()).contains("프랜차이즈", "가맹점", "창업");
        assertThat(result.relevanceScore()).isBetween(0.0, 1.0);
    }

    @Test
    void 관심_키워드가_없으면_관련_문단을_반환하지_않는다() {
        CrawledDocument document = new CrawledDocument(
                null,
                "스포츠 경기 결과",
                null,
                null,
                null,
                "article",
                List.of("선수와 경기 결과만 설명하는 충분히 긴 스포츠 기사 문장입니다."),
                "본문",
                Instant.now()
        );

        assertThat(filter.filter(document, null).paragraphs()).isEmpty();
    }
}
