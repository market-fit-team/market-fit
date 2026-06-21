CREATE TABLE posts (
    id UUID PRIMARY KEY,
    author_id VARCHAR(200) NOT NULL,
    author_name VARCHAR(120) NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('TREND', 'GUIDE', 'POLICY')),
    read_time_minutes INTEGER NOT NULL CHECK (read_time_minutes BETWEEN 1 AND 120),
    published_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_feed
    ON posts (published_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_posts_category_feed
    ON posts (category, published_at DESC, id DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_posts_author_feed
    ON posts (author_id, published_at DESC, id DESC)
    WHERE deleted_at IS NULL;
