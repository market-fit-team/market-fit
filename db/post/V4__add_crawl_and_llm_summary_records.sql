ALTER TABLE posts
    ADD COLUMN user_id VARCHAR(200),
    ADD COLUMN thumbnail_url VARCHAR(2000),
    ADD COLUMN source_id UUID,
    ADD COLUMN status VARCHAR(20),
    ADD COLUMN visibility VARCHAR(20);

UPDATE posts
SET user_id = author_id,
    status = 'PUBLISHED',
    visibility = 'PUBLIC';

ALTER TABLE posts
    ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'DRAFT',
    ALTER COLUMN visibility SET NOT NULL,
    ALTER COLUMN visibility SET DEFAULT 'PRIVATE';

ALTER TABLE posts
    ALTER COLUMN author_id DROP NOT NULL,
    ALTER COLUMN author_name DROP NOT NULL,
    ALTER COLUMN author_name SET DEFAULT '',
    ALTER COLUMN category SET DEFAULT 'TREND',
    ALTER COLUMN read_time_minutes SET DEFAULT 1,
    ALTER COLUMN published_at SET DEFAULT NOW();

CREATE FUNCTION sync_posts_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := NEW.author_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_posts_sync_user_id
    BEFORE INSERT OR UPDATE OF author_id, user_id
    ON posts
    FOR EACH ROW
    EXECUTE FUNCTION sync_posts_user_id();

ALTER TABLE posts
    DROP CONSTRAINT IF EXISTS posts_source_type_check;

ALTER TABLE posts
    ADD CONSTRAINT posts_source_type_check
        CHECK (source_type IN ('MANUAL', 'CRAWLING', 'LLM_REPORT')),
    ADD CONSTRAINT posts_status_check
        CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    ADD CONSTRAINT posts_visibility_check
        CHECK (visibility IN ('PRIVATE', 'PUBLIC'));

CREATE TABLE post_crawl_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID,
    url VARCHAR(2000),
    keyword VARCHAR(500),
    raw_content TEXT,
    extracted_title VARCHAR(500),
    crawled_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_post_crawl_sources_post
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    CONSTRAINT post_crawl_sources_status_check
        CHECK (status IN ('REQUESTED', 'CRAWLED', 'FAILED')),
    CONSTRAINT post_crawl_sources_input_check
        CHECK (url IS NOT NULL OR raw_content IS NOT NULL),
    CONSTRAINT post_crawl_sources_crawled_result_check
        CHECK (
            status <> 'CRAWLED'
            OR (raw_content IS NOT NULL AND crawled_at IS NOT NULL)
        ),
    CONSTRAINT post_crawl_sources_failed_error_check
        CHECK (status <> 'FAILED' OR error_message IS NOT NULL)
);

CREATE TABLE post_llm_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(200) NOT NULL,
    prompt TEXT NOT NULL,
    summary TEXT,
    token_usage JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_post_llm_summaries_post
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
    CONSTRAINT post_llm_summaries_status_check
        CHECK (status IN ('REQUESTED', 'SUMMARIZED', 'FAILED')),
    CONSTRAINT post_llm_summaries_token_usage_check
        CHECK (token_usage IS NULL OR jsonb_typeof(token_usage) = 'object'),
    CONSTRAINT post_llm_summaries_result_check
        CHECK (status <> 'SUMMARIZED' OR summary IS NOT NULL),
    CONSTRAINT post_llm_summaries_failed_error_check
        CHECK (status <> 'FAILED' OR error_message IS NOT NULL)
);

ALTER TABLE posts
    ADD CONSTRAINT fk_posts_source
        FOREIGN KEY (source_id) REFERENCES post_crawl_sources(id) ON DELETE SET NULL;

CREATE INDEX idx_posts_main_public_feed
    ON posts (created_at DESC, id DESC)
    WHERE visibility = 'PUBLIC'
      AND status = 'PUBLISHED'
      AND deleted_at IS NULL;

CREATE INDEX idx_posts_user_feed
    ON posts (user_id, created_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_post_crawl_sources_post
    ON post_crawl_sources (post_id, created_at DESC);

CREATE INDEX idx_post_crawl_sources_status
    ON post_crawl_sources (status, created_at);

CREATE INDEX idx_post_llm_summaries_post
    ON post_llm_summaries (post_id, created_at DESC);

CREATE INDEX idx_post_llm_summaries_status
    ON post_llm_summaries (status, created_at);

COMMENT ON COLUMN posts.source_id IS
    'Post 생성에 사용한 대표 post_crawl_sources.id. 수동 Post이면 null이다.';

COMMENT ON COLUMN post_llm_summaries.token_usage IS
    'Provider 사용량 JSON. 예: {"inputTokens":100,"outputTokens":50,"totalTokens":150}';

COMMENT ON COLUMN post_crawl_sources.post_id IS
    '성공 시 생성된 posts.id. Post 생성 전 실패를 기록할 수 있도록 nullable이다.';

COMMENT ON COLUMN post_llm_summaries.post_id IS
    '성공 시 생성된 posts.id. LLM 실패를 기록할 수 있도록 nullable이다.';

COMMENT ON FUNCTION sync_posts_user_id() IS
    '기존 author_id 기반 writer와 신규 user_id 계약이 공존하는 V4 호환 trigger다.';
