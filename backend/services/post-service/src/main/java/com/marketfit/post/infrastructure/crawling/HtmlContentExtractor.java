package com.marketfit.post.infrastructure.crawling;

import java.util.LinkedHashSet;
import java.util.List;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class HtmlContentExtractor {

    private static final int MAX_CONTENT_LENGTH = 100_000;

    public ExtractedContent extract(String html, String baseUrl) {
        Document document = Jsoup.parse(html, baseUrl);
        document.select("script, style, noscript, nav, footer, header, aside, form, svg, button, iframe").remove();

        Element content = firstNonEmpty(
                document.selectFirst("article"),
                document.selectFirst("main"),
                document.body()
        );
        String usedSelector = content == null
                ? "none"
                : content.tagName().equals("article") ? "article"
                : content.tagName().equals("main") ? "main" : "body";
        List<String> paragraphs = content == null
                ? List.of()
                : new LinkedHashSet<>(content.select("p, h1, h2, h3, li").eachText())
                        .stream()
                        .map(this::normalize)
                        .filter(value -> value.length() >= 20)
                        .toList();
        if (paragraphs.isEmpty() && content != null && !normalize(content.text()).isBlank()) {
            paragraphs = List.of(normalize(content.text()));
        }
        String text = limit(String.join("\n", paragraphs));
        return new ExtractedContent(
                normalize(document.title()),
                normalize(document.select("meta[name=description]").attr("content")),
                normalize(document.select("meta[property=og:title]").attr("content")),
                normalize(document.select("meta[property=og:description]").attr("content")),
                usedSelector,
                paragraphs,
                text
        );
    }

    private Element firstNonEmpty(Element... candidates) {
        for (Element candidate : candidates) {
            if (candidate != null && !candidate.text().isBlank()) {
                return candidate;
            }
        }
        return null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
    }

    private String limit(String content) {
        return content.length() <= MAX_CONTENT_LENGTH
                ? content
                : content.substring(0, MAX_CONTENT_LENGTH);
    }

    public record ExtractedContent(
            String title,
            String metaDescription,
            String ogTitle,
            String ogDescription,
            String usedSelector,
            List<String> paragraphs,
            String content
    ) {
    }
}
