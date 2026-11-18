-- =====================================================================
-- Migration 003: bildirişlər və fəaliyyət jurnalı (hər ikisi konkret workspace ilə bağlıdır)
--
-- ƏLAVƏEDİCİDİR: yalnız yeni cədvəllər. Mövcud cədvəllərdəki məlumata toxunmur.
-- Mövcud boards cədvəlinə yalnız bir unikal index əlavə olunur (məlumat dəyişmir).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Bildirişlər: istifadəçinin ŞƏXSİ hesabına aiddir (user_id), amma hər biri konkret workspace-ə bağlıdır
--    (workspace_id məcburidir). Workspace silinəndə onun bildirişləri də silinir.
--    type: invitation | invitation_accepted | invitation_rejected  (sonradan yenilərini əlavə etmək asandır)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- hərəkəti edən şəxs
    type         VARCHAR(40) NOT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_ws     ON notifications (workspace_id);

-- ---------------------------------------------------------------------
-- 2) Fəaliyyət jurnalı: hər qeyd bir workspace-ə (və istəyə görə onun board-una) bağlıdır.
--    Board-un həmin workspace-ə aid olması BAZA SƏVİYYƏSİNDƏ yoxlanılır (kompozit xarici açar).
--    Board silinəndə qeyd qalır, yalnız board_id boşalır (PostgreSQL 15+ sintaksisi).
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'boards_id_workspace_key') THEN
        ALTER TABLE boards ADD CONSTRAINT boards_id_workspace_key UNIQUE (id, workspace_id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS activity_log (
    id           SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    board_id     INTEGER,
    user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action       VARCHAR(50) NOT NULL,        -- məs. task_created, task_moved, comment_added
    entity_type  VARCHAR(30),                 -- task | column | board | member ...
    entity_id    INTEGER,
    message      TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT activity_board_same_workspace
        FOREIGN KEY (board_id, workspace_id) REFERENCES boards (id, workspace_id) ON DELETE SET NULL (board_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_ws    ON activity_log (workspace_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_activity_board ON activity_log (board_id);

-- ---------------------------------------------------------------------
-- 3) RLS yeni cədvəllərdə də aktivdir (siyasətsiz = Supabase-in açıq API-si çata bilmir)
-- ---------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log  ENABLE ROW LEVEL SECURITY;
