package com.marketfit.post.core.crawling;

public interface ContentCrawler {

    FetchedPage fetch(String url);

    CrawledDocument crawl(String url);
}
