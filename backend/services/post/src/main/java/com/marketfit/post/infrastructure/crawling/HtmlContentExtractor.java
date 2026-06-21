package com.marketfit.post.infrastructure.crawling;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;

@Component
public class HtmlContentExtractor {

    private static final int MAX_CONTENT_LENGTH = 100_000;

    public ExtractedContent extract(String html, String baseUrl) {
        Document document = Jsoup.parse(html, baseUrl);
        document.select("script, style, noscript, nav, footer, header, aside, form").remove();

        Element content = firstNonEmpty(
                document.selectFirst("article"),
                document.selectFirst("main"),
                document.body()
        );
        String text = content == null ? "" : normalize(content.text());
        return new ExtractedContent(
                normalize(document.title()),
                normalize(document.select("meta[name=description]").attr("content")),
                limit(text)
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
            String content
    ) {
    }
}
