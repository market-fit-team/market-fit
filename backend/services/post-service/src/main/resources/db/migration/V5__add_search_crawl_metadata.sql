ALTER TABLE post_crawl_sources
    ADD COLUMN input_url_type VARCHAR(30),
    ADD COLUMN discovered_article_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN crawled_article_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN skipped_article_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN matched_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN matched_paragraph_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN total_paragraph_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN relevance_score DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE post_crawl_sources
    ADD CONSTRAINT post_crawl_sources_input_url_type_check
        CHECK (
            input_url_type IS NULL
            OR input_url_type IN ('SEARCH_RESULT', 'ARTICLE', 'RAW_CONTENT', 'UNKNOWN')
        ),
    ADD CONSTRAINT post_crawl_sources_discovered_urls_check
        CHECK (jsonb_typeof(discovered_article_urls) = 'array'),
    ADD CONSTRAINT post_crawl_sources_matched_keywords_check
        CHECK (jsonb_typeof(matched_keywords) = 'array'),
    ADD CONSTRAINT post_crawl_sources_article_counts_check
        CHECK (crawled_article_count >= 0 AND skipped_article_count >= 0),
    ADD CONSTRAINT post_crawl_sources_paragraph_counts_check
        CHECK (
            matched_paragraph_count >= 0
            AND total_paragraph_count >= 0
            AND matched_paragraph_count <= total_paragraph_count
        ),
    ADD CONSTRAINT post_crawl_sources_relevance_score_check
        CHECK (relevance_score BETWEEN 0 AND 1);

COMMENT ON COLUMN post_crawl_sources.discovered_article_urls IS
    '검색 결과 페이지에서 선택한 최대 5개 기사 URL 배열';

COMMENT ON COLUMN post_crawl_sources.relevance_score IS
    '상가·창업·프랜차이즈 관련도. 0.0~1.0';
