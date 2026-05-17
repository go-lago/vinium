CREATE TABLE IF NOT EXISTS contexts (
    id         UUID        PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL DEFAULT '',
    color      VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    icon       VARCHAR(4)  NOT NULL DEFAULT '🌐',
    is_default BOOLEAN     NOT NULL DEFAULT false,
    sort_order INT         NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contexts_user_id ON contexts(user_id);

CREATE TABLE IF NOT EXISTS projects (
    id          UUID        PRIMARY KEY,
    context_id  UUID        NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL DEFAULT '',
    description TEXT        NOT NULL DEFAULT '',
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    color       VARCHAR(20) NOT NULL DEFAULT '#6366f1',
    icon        VARCHAR(4)  NOT NULL DEFAULT '📁',
    sort_order  INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_projects_context_id ON projects(context_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);

-- Add context_id and project_id to notes and tasks
ALTER TABLE notes ADD COLUMN IF NOT EXISTS context_id UUID REFERENCES contexts(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS context_id UUID REFERENCES contexts(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notes_context_id   ON notes(context_id);
CREATE INDEX IF NOT EXISTS idx_notes_project_id   ON notes(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_context_id   ON tasks(context_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id   ON tasks(project_id);
