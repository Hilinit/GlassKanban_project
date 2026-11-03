-- GlassKanban database schema.
-- Server işə düşəndə avtomatik işləyir (IF NOT EXISTS olduğu üçün təkrar işlətmək təhlükəsizdir).

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hansı istifadəçi hansı workspace-in üzvüdür (role: 'owner' və ya 'member')
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(20) NOT NULL DEFAULT 'member',
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS boards (
    id           SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title        VARCHAR(100) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS columns (
    id       SERIAL PRIMARY KEY,
    board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title    VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
    id          SERIAL PRIMARY KEY,
    column_id   INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority    VARCHAR(10) NOT NULL DEFAULT 'low',   -- low | medium | high
    due_date    DATE,
    assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id         SERIAL PRIMARY KEY,
    task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boards_workspace  ON boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_columns_board     ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column      ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_comments_task     ON comments(task_id);

-- Təhlükəsizlik (Supabase): RLS aktiv olunur və heç bir policy yazılmır.
-- Nəticə: Supabase-in öz açıq REST API-si bu cədvəllərə çata bilmir.
-- Bizim backend "postgres" rolu ilə qoşulur və RLS-i keçir, ona görə işləməyə davam edir.
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments          ENABLE ROW LEVEL SECURITY;
