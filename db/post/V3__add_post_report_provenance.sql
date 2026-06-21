ALTER TABLE posts
    ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
        CHECK (source_type IN ('MANUAL', 'LLM_REPORT')),
    ADD COLUMN source_url VARCHAR(2000),
    ADD COLUMN source_title VARCHAR(300),
    ADD COLUMN collected_at TIMESTAMPTZ,
    ADD COLUMN llm_provider VARCHAR(100);

CREATE INDEX idx_posts_source_type_feed
    ON posts (source_type, published_at DESC, id DESC)
    WHERE deleted_at IS NULL;

UPDATE posts
SET source_type = 'LLM_REPORT',
    llm_provider = 'mock-v1',
    collected_at = published_at
WHERE author_id = 'seed';
