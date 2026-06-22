package com.marketfit.post.infrastructure.crawling;

import java.net.URI;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;

import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import com.marketfit.post.core.crawling.ArticleLinkCandidate;

@Component
public class ArticleLinkExtractor {

    private static final List<String> INCLUDE = List.of(
            "news", "article", "기사", "뉴스", "경제", "산업", "부동산", "상권", "상가",
            "창업", "프랜차이즈", "가맹", "소상공인", "자영업", "외식", "카페", "점포", "매장"
    );
    private static final List<String> EXCLUDE = List.of(
            "login", "logout", "signup", "register", "subscribe", "event", "promotion",
            "advertisement", "customer", "help", "notice", "terms", "privacy", "mypage",
            "share", "facebook", "twitter", "instagram", "youtube", "image", "photo", "video"
    );

    public List<ArticleLinkCandidate> extract(String pageUrl, String html, int limit) {
        URI base = URI.create(pageUrl);
        String host = base.getHost();
        var unique = new LinkedHashMap<String, ArticleLinkCandidate>();
        for (var link : Jsoup.parse(html, pageUrl).select("a[href]")) {
            String href = link.attr("href").trim();
            if (href.isBlank() || href.startsWith("#") || href.startsWith("javascript:")
                    || href.startsWith("mailto:") || href.startsWith("tel:")) {
                continue;
            }
            try {
                URI uri = base.resolve(href);
                if (!List.of("http", "https").contains(uri.getScheme())
                        || uri.getHost() == null
                        || !uri.getHost().equalsIgnoreCase(host)) {
                    continue;
                }
                String text = link.text().replaceAll("\\s+", " ").trim();
                String target = (uri + " " + text).toLowerCase(Locale.ROOT);
                if (EXCLUDE.stream().anyMatch(target::contains)) {
                    continue;
                }
                List<String> matched = INCLUDE.stream().filter(target::contains).toList();
                int score = matched.size() * 10
                        + (text.length() >= 12 ? 3 : 0)
                        + (target.contains("/article") || target.contains("/news") ? 5 : 0);
                if (score <= 0) {
                    continue;
                }
                String normalized = new URI(
                        uri.getScheme(), uri.getAuthority(), uri.getPath(), uri.getQuery(), null
                ).toString();
                ArticleLinkCandidate candidate = new ArticleLinkCandidate(normalized, text, score, matched);
                unique.merge(normalized, candidate, (left, right) -> left.score() >= right.score() ? left : right);
            } catch (Exception ignored) {
                // 잘못된 링크 하나가 전체 검색 결과 처리를 중단하지 않게 한다.
            }
        }
        return new ArrayList<>(unique.values()).stream()
                .sorted(Comparator.comparingInt(ArticleLinkCandidate::score).reversed())
                .limit(Math.min(Math.max(limit, 1), 5))
                .toList();
    }
}
