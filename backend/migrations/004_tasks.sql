CREATE TABLE IF NOT EXISTS tasks (
    id          UUID PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL DEFAULT '',
    description TEXT        NOT NULL DEFAULT '',
    status      VARCHAR(20) NOT NULL DEFAULT 'todo',
    priority    VARCHAR(20) NOT NULL DEFAULT 'none',
    due_date    TIMESTAMPTZ,
    note_id     UUID        REFERENCES notes(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id   ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
