package com.marketfit.post.infrastructure.crawling;

import java.net.URI;

import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import com.marketfit.post.core.crawling.InputUrlType;

@Component
public class UrlTypeDetector {

    public InputUrlType detect(String url, String html) {
        String lowerUrl = url == null ? "" : url.toLowerCase();
        var document = Jsoup.parse(html == null ? "" : html, url == null ? "" : url);
        if (lowerUrl.contains("/search")
                || queryContains(url, "query")
                || queryContains(url, "page")
                || document.select("a[href]").size() >= 8 && document.select("article").size() >= 2) {
            return InputUrlType.SEARCH_RESULT;
        }
        if (!document.select("article").isEmpty()
                || "article".equalsIgnoreCase(document.select("meta[property=og:type]").attr("content"))
                || !document.select("meta[property=article:published_time]").isEmpty()) {
            return InputUrlType.ARTICLE;
        }
        String title = document.title();
        String body = document.select("main, body").text();
        return title.length() >= 5 && body.length() >= 200
                ? InputUrlType.ARTICLE
                : InputUrlType.UNKNOWN;
    }

    private boolean queryContains(String url, String key) {
        try {
            String query = URI.create(url).getQuery();
            return query != null && query.toLowerCase().matches(".*(^|&)" + key + "=.*");
        } catch (Exception ignored) {
            return false;
        }
    }
}
