package com.marketfit.post.core.crawling;

public interface ContentCrawler {

    CrawledDocument crawl(String url);
}
