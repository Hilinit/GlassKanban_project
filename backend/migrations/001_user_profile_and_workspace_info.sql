-- =====================================================================
-- Migration 001: ümumi istifadəçi profili + workspace (layihə) məlumatları
--
-- ƏLAVƏEDİCİDİR: yalnız yeni sütunlar və index əlavə edir. Heç nə silinmir və
-- mövcud sətirlərin heç bir dəyəri dəyişdirilmir. Təkrar işlədilsə zərər vermir.
-- =====================================================================

-- Ön yoxlama: köhnə (v1) cədvəllər mövcud olmalıdır
DO $$
BEGIN
    IF to_regclass('public.users') IS NULL OR to_regclass('public.workspaces') IS NULL
       OR to_regclass('public.workspace_members') IS NULL OR to_regclass('public.boards') IS NULL THEN
        RAISE EXCEPTION 'Əvvəlki versiyanın cədvəlləri tapılmadı. Əvvəlcə backend-i bir dəfə işə sal ki, əsas cədvəllər yaransın.';
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1) Şəxsi profil: BÜTÜN workspace-lər üçün ümumidir (users cədvəlində qalır)
--    Workspace-ə aid məlumatlar (rol, vəzifə, icazə, status) bu cədvəldə SAXLANILMIR.
-- ---------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS surname    VARCHAR(100);   -- köhnə hesablarda NULL (ad tam adı saxlayır)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;           -- kiçildilmiş şəkil (data URL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      VARCHAR(40);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio        VARCHAR(500);

-- "Bir istifadəçi = bir hesab": e-poçt böyük/kiçik hərfə baxmadan unikal olsun.
-- Mövcud hesablarda belə təkrar varsa index YARADILMIR (heç nə pozulmur), yalnız xəbərdarlıq verilir.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'users_email_lower_key') THEN
        IF EXISTS (SELECT 1 FROM users GROUP BY lower(email) HAVING COUNT(*) > 1) THEN
            RAISE NOTICE 'users_email_lower_key yaradılmadı: bəzi e-poçtlar yalnız hərf registri ilə fərqlənir. Mövcud hesablara toxunulmadı.';
        ELSE
            CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));
        END IF;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) Workspace (layihə) məlumatları. Mövcud workspace-lər boş dəyərlə qalır.
-- ---------------------------------------------------------------------
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS goal        TEXT NOT NULL DEFAULT '';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS category    VARCHAR(60) NOT NULL DEFAULT '';
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS start_date  DATE;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS end_date    DATE;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'workspaces_dates_check') THEN
        ALTER TABLE workspaces
            ADD CONSTRAINT workspaces_dates_check
            CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
    END IF;
END $$;
