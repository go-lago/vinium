-- Notes table: initial creation (for fresh installs without AutoMigrate)
CREATE TABLE IF NOT EXISTS notes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT '',
    content         TEXT NOT NULL DEFAULT '',
    content_plain   TEXT NOT NULL DEFAULT '',
    content_version INT  NOT NULL DEFAULT 1,
    type            TEXT NOT NULL DEFAULT 'note',
    tags            JSONB NOT NULL DEFAULT '[]',
    metadata        JSONB NOT NULL DEFAULT '{}',
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id    ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_type       ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_tags       ON notes USING GIN (tags);

-- If upgrading from 001 (notes table already exists), apply these ALTER statements:
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content_plain   TEXT    NOT NULL DEFAULT '';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content_version INT     NOT NULL DEFAULT 1;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS type            TEXT    NOT NULL DEFAULT 'note';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags            JSONB   NOT NULL DEFAULT '[]';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS metadata        JSONB   NOT NULL DEFAULT '{}';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notes_type       ON notes(type);
CREATE INDEX IF NOT EXISTS idx_notes_tags       ON notes USING GIN (tags);

-- FK constraint (skip if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_notes_user_id' AND table_name = 'notes'
    ) THEN
        ALTER TABLE notes
            ADD CONSTRAINT fk_notes_user_id
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;
