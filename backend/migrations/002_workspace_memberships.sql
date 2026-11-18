-- =====================================================================
-- Migration 002: hər workspace üçün ayrıca üzvlük qeydi (rol, vəzifə, icazə, status)
--
-- workspace_members artıq "istifadəçi <-> workspace" üzvlüyüdür və HƏR üzvlüyün öz atributları var.
-- (workspace_id, user_id) əsas açar saxlanılır: bir istifadəçi çox workspace-də üzv ola bilər,
-- amma eyni workspace-də yalnız bir üzvlük qeydi ola bilər.
--
-- ƏLAVƏEDİCİDİR. Mövcud üzvlüklər avtomatik status='active' olur, rolları (owner/member) dəyişmir.
-- =====================================================================

-- Ön yoxlama: mövcud rollar yeni icazə verilən siyahıya uyğun olmalıdır.
-- Uyğun deyilsə heç nə dəyişmir (migration dayanır) və aydın xəta verilir.
DO $$
DECLARE bad integer;
BEGIN
    SELECT COUNT(*) INTO bad FROM workspace_members WHERE role NOT IN ('owner', 'admin', 'member', 'viewer');
    IF bad > 0 THEN
        RAISE EXCEPTION 'workspace_members-də % sətirin rolu naməlumdur (owner/admin/member/viewer deyil). Əvvəlcə onları yoxla.', bad;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1) Üzvlüyün özünə məxsus atributlar
--    status: pending (sorğu gözləyir) | active | rejected (imtina edib) | removed (rəhbər çıxarıb)
--    role:   owner | admin | member | viewer   (standart icazə dəstini müəyyən edir)
--    job_title: vəzifə (Frontend Developer, ... və ya fərdi mətn). ROLDAN VƏ İCAZƏDƏN AYRI anlayışdır.
--    permissions: fərdi icazələr, rolun standart dəyərlərini əvəz edir, məs. {"edit_task": false}
-- ---------------------------------------------------------------------
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS status       VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS job_title    VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS permissions  JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS invited_by   INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS invited_at   TIMESTAMPTZ;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_status_check') THEN
        ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_status_check
            CHECK (status IN ('pending', 'active', 'rejected', 'removed'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_role_check') THEN
        ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check
            CHECK (role IN ('owner', 'admin', 'member', 'viewer'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_permissions_check') THEN
        ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_permissions_check
            CHECK (jsonb_typeof(permissions) = 'object');
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Index-lər
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_wm_user_status      ON workspace_members (user_id, status);       -- "mənim aktiv workspace-lərim", "gözləyən dəvətlərim"
CREATE INDEX IF NOT EXISTS idx_wm_workspace_status ON workspace_members (workspace_id, status);  -- komanda siyahısı
CREATE INDEX IF NOT EXISTS idx_tasks_assignee      ON tasks (assignee_id);                       -- üzv statistikası

-- ---------------------------------------------------------------------
-- 3) Hər workspace-də ən çoxu BİR owner üzvlüyü ola bilər.
--    Mövcud məlumatda bir workspace-də birdən çox owner varsa index YARADILMIR (heç nə pozulmur).
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'workspace_members_one_owner') THEN
        IF EXISTS (SELECT 1 FROM workspace_members WHERE role = 'owner' GROUP BY workspace_id HAVING COUNT(*) > 1) THEN
            RAISE NOTICE 'workspace_members_one_owner yaradılmadı: bəzi workspace-lərdə birdən çox owner var. Mövcud məlumata toxunulmadı.';
        ELSE
            CREATE UNIQUE INDEX workspace_members_one_owner ON workspace_members (workspace_id) WHERE role = 'owner';
        END IF;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4) Tutarlılıq: workspaces.owner_id olan istifadəçinin həmin workspace-də üzvlük qeydi olmalıdır.
--    Köhnə məlumatda belə qeydi olmayan workspace varsa, YALNIZ çatışan qeyd ƏLAVƏ olunur
--    (mövcud sətirlərə toxunulmur, heç nə silinmir).
-- ---------------------------------------------------------------------
INSERT INTO workspace_members (workspace_id, user_id, role, status)
SELECT w.id, w.owner_id, 'owner', 'active'
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM workspace_members m WHERE m.workspace_id = w.id AND m.user_id = w.owner_id
);

-- ---------------------------------------------------------------------
-- 5) Üzvlük statusu dəyişikliklərinin tarixçəsi ("sorğu göndərildi", "qəbul etdi", "çıxarıldı" ...)
--    Cədvəl workspace ilə bağlıdır. Qeydləri trigger avtomatik yazır, tətbiq kodundan asılı deyil.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membership_events (
    id           SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      INTEGER NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    from_status  VARCHAR(20),                                -- NULL = ilk qeyd
    to_status    VARCHAR(20) NOT NULL,
    role         VARCHAR(20),                                -- həmin andakı rol
    changed_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_membership_events_ws   ON membership_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_membership_events_user ON membership_events (user_id);

-- Qeyd: üzvlük sətri SİLİNƏNDƏ (məs. workspace silinəndə) jurnal yazılmır; yalnız yaradılma və status dəyişikliyi yazılır.
-- changed_by: tətbiq SET LOCAL app.user_id ilə kim olduğunu bildirə bilər; bildirməsə NULL qalır.
CREATE OR REPLACE FUNCTION log_membership_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO membership_events (workspace_id, user_id, from_status, to_status, role, changed_by)
    VALUES (
        NEW.workspace_id, NEW.user_id,
        CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
        NEW.status, NEW.role,
        NULLIF(current_setting('app.user_id', true), '')::integer
    );
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_membership_insert ON workspace_members;
CREATE TRIGGER trg_membership_insert AFTER INSERT ON workspace_members
    FOR EACH ROW EXECUTE FUNCTION log_membership_change();

DROP TRIGGER IF EXISTS trg_membership_status ON workspace_members;
CREATE TRIGGER trg_membership_status AFTER UPDATE OF status ON workspace_members
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION log_membership_change();

ALTER TABLE membership_events ENABLE ROW LEVEL SECURITY;  -- siyasətsiz: Supabase-in açıq API-si çata bilmir
