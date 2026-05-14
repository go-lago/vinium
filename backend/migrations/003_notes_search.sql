-- GIN index for full-text search over title + content_plain.
-- Uses 'simple' dictionary (language-agnostic: works for English, Russian, etc.)
-- plainto_tsquery('simple', 'query text') is used in repository.Search().
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notes_fts
    ON notes
    USING GIN (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content_plain, '')));
