const express = require('express')
const { query, transaction } = require('../db')
const requireAuth = require('../middleware/auth')
const { getMembership, getAnyMembership } = require('../access')
const { ASSIGNABLE_ROLES, sanitizePermissions, effectivePermissions } = require('../permissions')
const { forbid, FULL_NAME } = require('../http')
const { notify } = require('../notify')

const router = express.Router()
router.use(requireAuth)

function optionalText(value, label, maxLength) {
    if (value === undefined || value === null) return { value: '' }
    if (typeof value !== 'string') return { error: `${label} mətn olmalıdır` }

    const text = value.trim()
    if (text.length > maxLength) return { error: `${label} maksimum ${maxLength} simvol ola bilər` }
    return { value: text }
}

function optionalDate(value, label) {
    if (value === undefined || value === null || value === '') return { value: null }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) {
        return { error: `${label} düzgün tarix formatında olmalıdır` }
    }

    const date = new Date(`${value}T00:00:00.000Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        return { error: `${label} düzgün tarix olmalıdır` }
    }
    return { value }
}

// GET /api/workspaces  -> mənim workspace-lərim + içindəki board-lar
router.get('/', async (req, res) => {
    const workspaces = await query(
        `SELECT w.id, w.name, w.description, w.goal, w.category, w.start_date, w.end_date,
                w.owner_id, m.role, m.job_title, m.permissions AS my_permissions,
                (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id AND status = 'active')::int AS member_count
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = $1 AND m.status = 'active'
         ORDER BY w.id`,
        [req.user.id]
    )

    const ids = workspaces.map(w => w.id)
    const boards = ids.length
        ? await query('SELECT id, workspace_id, title FROM boards WHERE workspace_id = ANY($1) ORDER BY id', [ids])
        : []

    const result = workspaces.map(({ my_permissions, ...w }) => ({
        ...w,
        permissions: effectivePermissions(w.role, my_permissions),
        boards: boards.filter(b => b.workspace_id === w.id)
    }))
    res.json({ workspaces: result })
})

// GET /api/workspaces/:id  -> tək workspace (yalnız aktiv üzv): mənim rolum, vəzifəm, icazələrim və board-lar
router.get('/:id', async (req, res) => {
    const rows = await query(
        `SELECT w.id, w.name, w.description, w.goal, w.category, w.start_date, w.end_date,
                w.owner_id, m.role, m.job_title, m.permissions AS my_permissions,
                (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id AND status = 'active')::int AS member_count
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id AND m.user_id = $2 AND m.status = 'active'
         WHERE w.id = $1`,
        [req.params.id, req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const { my_permissions, ...workspace } = rows[0]
    const boards = await query('SELECT id, workspace_id, title FROM boards WHERE workspace_id = $1 ORDER BY id', [req.params.id])
    res.json({ workspace: { ...workspace, permissions: effectivePermissions(workspace.role, my_permissions), boards } })
})

// POST /api/workspaces  { name, description?, goal?, category?, start_date?, end_date? }
router.post('/', async (req, res) => {
    const body = req.body || {}
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) return res.status(400).json({ error: 'Workspace adı tələb olunur' })
    if (name.length > 100) return res.status(400).json({ error: 'Workspace adı maksimum 100 simvol ola bilər' })

    const description = optionalText(body.description, 'Təsvir', 2000)
    const goal = optionalText(body.goal, 'Məqsəd', 2000)
    const category = optionalText(body.category, 'Kateqoriya', 60)
    const startDate = optionalDate(body.start_date, 'Başlama tarixi')
    const endDate = optionalDate(body.end_date, 'Bitmə tarixi')
    const invalidField = [description, goal, category, startDate, endDate].find(field => field.error)
    if (invalidField) return res.status(400).json({ error: invalidField.error })
    if (startDate.value && endDate.value && endDate.value < startDate.value) {
        return res.status(400).json({ error: 'Bitmə tarixi başlama tarixindən əvvəl ola bilməz' })
    }

    const workspace = await transaction(async (client) => {
        const ws = await client.query(
            `INSERT INTO workspaces (name, owner_id, description, goal, category, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, name, owner_id, description, goal, category, start_date, end_date`,
            [name, req.user.id, description.value, goal.value, category.value, startDate.value, endDate.value]
        )
        await client.query(
            "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
            [ws.rows[0].id, req.user.id]
        )
        return ws.rows[0]
    })

    res.status(201).json({
        workspace: {
            ...workspace,
            role: 'owner',
            permissions: effectivePermissions('owner'),
            member_count: 1,
            boards: []
        }
    })
})

// PATCH /api/workspaces/:id  { name?, description?, goal?, category?, start_date?, end_date? }
router.patch('/:id', async (req, res) => {
    const membership = await getMembership(req.params.id, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })
    if (membership.role !== 'owner') return forbid(res)

    const body = req.body || {}
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)
    const editableFields = ['name', 'description', 'goal', 'category', 'start_date', 'end_date']
    if (!editableFields.some(has)) return res.status(400).json({ error: 'Dəyişiklik göndərilməyib' })

    const rows = await query(
        `SELECT id, name, description, goal, category,
                to_char(start_date, 'YYYY-MM-DD') AS start_date,
                to_char(end_date, 'YYYY-MM-DD') AS end_date
         FROM workspaces WHERE id = $1`,
        [req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Workspace tapılmadı' })
    const current = rows[0]

    const name = has('name') ? optionalText(body.name, 'Workspace adı', 100) : { value: current.name }
    const description = has('description') ? optionalText(body.description, 'Təsvir', 2000) : { value: current.description }
    const goal = has('goal') ? optionalText(body.goal, 'Məqsəd', 2000) : { value: current.goal }
    const category = has('category') ? optionalText(body.category, 'Kateqoriya', 60) : { value: current.category }
    const startDate = has('start_date') ? optionalDate(body.start_date, 'Başlama tarixi') : { value: current.start_date }
    const endDate = has('end_date') ? optionalDate(body.end_date, 'Bitmə tarixi') : { value: current.end_date }

    const invalidField = [name, description, goal, category, startDate, endDate].find(field => field.error)
    if (invalidField) return res.status(400).json({ error: invalidField.error })
    if (!name.value) return res.status(400).json({ error: 'Workspace adı tələb olunur' })
    if (startDate.value && endDate.value && endDate.value < startDate.value) {
        return res.status(400).json({ error: 'Bitmə tarixi başlama tarixindən əvvəl ola bilməz' })
    }

    const updated = await query(
        `UPDATE workspaces
         SET name = $2, description = $3, goal = $4, category = $5, start_date = $6, end_date = $7
         WHERE id = $1
         RETURNING id, name, description, goal, category,
                   to_char(start_date, 'YYYY-MM-DD') AS start_date,
                   to_char(end_date, 'YYYY-MM-DD') AS end_date`,
        [req.params.id, name.value, description.value, goal.value, category.value, startDate.value, endDate.value]
    )
    res.json({ workspace: updated[0] })
})

// DELETE /api/workspaces/:id  (yalnız owner)
router.delete('/:id', async (req, res) => {
    const membership = await getMembership(req.params.id, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })
    if (membership.role !== 'owner') {
        return res.status(403).json({ error: 'Yalnız sahibi workspace-i silə bilər' })
    }
    await query('DELETE FROM workspaces WHERE id = $1', [req.params.id])
    res.json({ ok: true })
})

// ---------------------------------------------------------------- Üzvlər

// GET /api/workspaces/:id/members
router.get('/:id/members', async (req, res) => {
    const membership = await getMembership(req.params.id, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const members = await query(
        `SELECT u.id, ${FULL_NAME('u')} AS name, u.email, m.role
         FROM workspace_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.workspace_id = $1 AND m.status = 'active'
         ORDER BY (m.role = 'owner') DESC, u.name`,
        [req.params.id]
    )
    res.json({ members })
})

// GET /api/workspaces/:id/team  -> Team Management: üzvlər statuslarla
// Aktiv üzvləri hər kəs görür; digər statuslar yalnız komanda icazəsi olanlara göstərilir.
router.get('/:id/team', async (req, res) => {
    const me = await getMembership(req.params.id, req.user.id)
    if (!me) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const canManage = me.perms.invite_members || me.perms.remove_members || me.perms.edit_member_titles || me.perms.manage_permissions
    const rows = await query(
        `SELECT u.id AS user_id, ${FULL_NAME('u')} AS name, u.email, u.avatar_url, m.role, m.status, m.job_title, m.permissions AS stored,
                m.invited_at, m.responded_at, ${FULL_NAME('inv')} AS invited_by_name
         FROM workspace_members m
         JOIN users u ON u.id = m.user_id
         LEFT JOIN users inv ON inv.id = m.invited_by
         WHERE m.workspace_id = $1 ${canManage ? '' : "AND m.status = 'active'"}
         ORDER BY CASE m.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,
                  CASE m.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 ELSE 3 END,
                  u.name`,
        [req.params.id]
    )

    const members = rows.map(({ stored, ...row }) => ({
        ...row,
        // fərdi icazələr yalnız onları idarə edə bilənə göstərilir
        permissions: me.perms.manage_permissions ? effectivePermissions(row.role, stored) : undefined
    }))

    const titles = await query(
        `SELECT DISTINCT job_title FROM workspace_members WHERE workspace_id = $1 AND job_title <> '' ORDER BY job_title`,
        [req.params.id]
    )

    res.json({
        members,
        job_titles: titles.map(t => t.job_title),
        me: { user_id: req.user.id, role: me.role, job_title: me.job_title, permissions: me.perms }
    })
})

// POST /api/workspaces/:id/members  { email, role?, job_title? }
// İstifadəçini e-poçtu (hesab adı) ilə dəvət edir: üzvlük 'pending' olur və istifadəçiyə bildiriş gedir.
// İstifadəçi qəbul edənə qədər workspace-in heç bir məlumatına giriş əldə etmir.
router.post('/:id/members', async (req, res) => {
    const workspaceId = Number(req.params.id)
    const me = await getMembership(workspaceId, req.user.id)
    if (!me) return res.status(404).json({ error: 'Workspace tapılmadı' })
    if (!me.perms.invite_members) return forbid(res)

    const email = (req.body.email || '').trim().toLowerCase()
    const role = req.body.role || 'member'
    const jobTitle = String(req.body.job_title || '').trim()

    if (!email) return res.status(400).json({ error: 'E-poçt tələb olunur' })
    if (jobTitle && !me.perms.edit_member_titles) return forbid(res)
    if (!ASSIGNABLE_ROLES.includes(role)) return res.status(400).json({ error: 'Rol yanlışdır' })
    if (role === 'admin' && me.role !== 'owner') return res.status(403).json({ error: 'Admin rolunu yalnız workspace sahibi verə bilər' })
    if (jobTitle.length > 80) return res.status(400).json({ error: 'Vəzifə adı çox uzundur (maks. 80 simvol)' })

    const users = await query(`SELECT id, ${FULL_NAME('users')} AS name, email FROM users WHERE email = $1`, [email])
    if (users.length === 0) {
        return res.status(404).json({ error: 'Bu e-poçtla istifadəçi hələ qeydiyyatdan keçməyib. Ondan əvvəlcə GlassKanban-da qeydiyyatdan keçməsini xahiş et.' })
    }
    const user = users[0]
    if (user.id === req.user.id) return res.status(409).json({ error: 'Özünü dəvət edə bilməzsən' })

    // Təkrar üzv əlavə olunmasının qarşısı: aktiv üzvə və ya artıq dəvət olunmuşa yenidən göndərmək olmaz
    const existing = await getAnyMembership(workspaceId, user.id)
    if (existing && existing.status === 'active') return res.status(409).json({ error: 'Bu istifadəçi artıq aktiv üzvdür' })
    if (existing && existing.status === 'pending') return res.status(409).json({ error: 'Bu istifadəçiyə dəvət artıq göndərilib' })

    try {
      await transaction(async (client) => {
        if (existing) {
            // əvvəl imtina edib və ya çıxarılıb: yenidən 'pending' olur, köhnə fərdi icazələr sıfırlanır
            await client.query(
                `UPDATE workspace_members
                 SET status = 'pending', role = $3, job_title = $4, permissions = '{}'::jsonb,
                     invited_by = $5, invited_at = NOW(), responded_at = NULL, updated_at = NOW()
                 WHERE workspace_id = $1 AND user_id = $2`,
                [workspaceId, user.id, role, jobTitle, req.user.id]
            )
        } else {
            await client.query(
                `INSERT INTO workspace_members (workspace_id, user_id, role, status, job_title, invited_by, invited_at)
                 VALUES ($1, $2, $3, 'pending', $4, $5, NOW())`,
                [workspaceId, user.id, role, jobTitle, req.user.id]
            )
        }
        await notify(user.id, workspaceId, req.user.id, 'invitation', client)
      })
    } catch (err) {
        // iki sorğu eyni anda gələrsə, bazanın əsas açarı təkrarı bloklayır: bu halda 500 yox, 409
        if (err.code === '23505') return res.status(409).json({ error: 'Bu istifadəçiyə dəvət artıq göndərilib' })
        throw err
    }

    res.status(201).json({
        member: { user_id: user.id, name: user.name, email: user.email, role, status: 'pending', job_title: jobTitle }
    })
})

// PATCH /api/workspaces/:id/members/:userId  { job_title?, role?, permissions? }
//   vəzifə            -> 'edit_member_titles' icazəsi
//   rol və icazələr   -> 'manage_permissions' icazəsi (owner-in rolu dəyişmir, öz rolunu və icazələrini dəyişmək olmaz,
//                         admin rolunu və admin-in icazələrini yalnız owner dəyişir, özündə olmayan icazəni başqasına vermək olmaz)
router.patch('/:id/members/:userId', async (req, res) => {
    const workspaceId = Number(req.params.id)
    const targetId = Number(req.params.userId)
    const me = await getMembership(workspaceId, req.user.id)
    if (!me) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const target = await getAnyMembership(workspaceId, targetId)
    if (!target) return res.status(404).json({ error: 'Üzv tapılmadı' })

    const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key)
    const wantsTitle = has('job_title')
    const wantsAccess = has('role') || has('permissions')
    if (!wantsTitle && !wantsAccess) return res.status(400).json({ error: 'Dəyişiklik göndərilməyib' })

    let jobTitle = target.job_title
    if (wantsTitle) {
        if (!me.perms.edit_member_titles) return forbid(res)
        jobTitle = String(req.body.job_title || '').trim()
        if (jobTitle.length > 80) return res.status(400).json({ error: 'Vəzifə adı çox uzundur (maks. 80 simvol)' })
    }

    let role = target.role
    let stored = target.permissions
    if (wantsAccess) {
        if (!me.perms.manage_permissions) return forbid(res)
        if (target.role === 'owner') return res.status(400).json({ error: 'Workspace sahibinin rolu və icazələri dəyişdirilə bilməz' })
        if (targetId === req.user.id) return res.status(403).json({ error: 'Öz rolunu və icazələrini dəyişə bilməzsən' })
        if (target.role === 'admin' && me.role !== 'owner') return res.status(403).json({ error: 'Admin-in icazələrini yalnız sahibi dəyişə bilər' })

        if (has('role')) {
            if (!ASSIGNABLE_ROLES.includes(req.body.role)) return res.status(400).json({ error: 'Rol yanlışdır' })
            if (req.body.role === 'admin' && me.role !== 'owner') return res.status(403).json({ error: 'Admin rolunu yalnız workspace sahibi verə bilər' })
            if (req.body.role !== target.role) stored = {} // rol dəyişəndə fərdi icazələr rolun standartına qayıdır
            role = req.body.role
        }
        if (has('permissions')) {
            stored = sanitizePermissions(req.body.permissions)
            for (const key of Object.keys(stored)) {
                if (stored[key] === true && !me.perms[key]) {
                    return res.status(403).json({ error: 'Özündə olmayan icazəni başqasına verə bilməzsən' })
                }
            }
        }
    }

    await query(
        `UPDATE workspace_members SET role = $3, job_title = $4, permissions = $5::jsonb, updated_at = NOW()
         WHERE workspace_id = $1 AND user_id = $2`,
        [workspaceId, targetId, role, jobTitle, JSON.stringify(stored)]
    )
    res.json({
        member: { user_id: targetId, role, job_title: jobTitle, status: target.status, permissions: effectivePermissions(role, stored) }
    })
})

// DELETE /api/workspaces/:id/members/:userId
//   * özünə qarşı: workspace-dən ayrılmaq (owner ayrıla bilməz), yalnız həmin workspace-dəki sətir silinir
//   * başqasına qarşı ('remove_members' lazımdır), vəziyyətə görə:
//       active   -> üzvlük SİLİNMİR, statusu 'removed' olur (deaktiv): giriş kəsilir, tapşırıq təyinatları yalnız bu workspace-də təmizlənir
//       pending  -> göndərilmiş dəvət ləğv olunur (sətir və dəvət bildirişi silinir)
//       rejected/removed -> siyahıdan təmizlənir
//   İstifadəçinin şəxsi hesabı və digər workspace-lərdəki üzvlükləri HEÇ VAXT təsirlənmir.
router.delete('/:id/members/:userId', async (req, res) => {
    const workspaceId = Number(req.params.id)
    const targetId = Number(req.params.userId)

    const membership = await getMembership(workspaceId, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const isSelf = targetId === req.user.id
    if (!isSelf && !membership.perms.remove_members) return forbid(res)

    const target = await getAnyMembership(workspaceId, targetId)
    if (!target) return res.status(404).json({ error: 'Üzv tapılmadı' })
    if (target.role === 'owner') {
        return res.status(400).json({ error: 'Workspace sahibi çıxarıla bilməz' })
    }
    if (!isSelf && target.role === 'admin' && membership.role !== 'owner') {
        return res.status(403).json({ error: 'Admin-i yalnız workspace sahibi çıxara bilər' })
    }

    await transaction(async (client) => {
        if (isSelf || target.status !== 'active') {
            await client.query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [workspaceId, targetId])
            if (target.status === 'pending') {
                await client.query(
                    "DELETE FROM notifications WHERE user_id = $1 AND workspace_id = $2 AND type = 'invitation'",
                    [targetId, workspaceId]
                )
            }
        } else {
            await client.query(
                "UPDATE workspace_members SET status = 'removed', responded_at = NOW(), updated_at = NOW() WHERE workspace_id = $1 AND user_id = $2",
                [workspaceId, targetId]
            )
        }
        if (target.status === 'active') {
            // Bu istifadəçiyə təyin olunmuş tapşırıqlar "təyin olunmayıb" olur (yalnız bu workspace-də)
            await client.query(
                `UPDATE tasks SET assignee_id = NULL
                 WHERE assignee_id = $2
                   AND column_id IN (
                       SELECT c.id FROM columns c JOIN boards b ON b.id = c.board_id
                       WHERE b.workspace_id = $1)`,
                [workspaceId, targetId]
            )
        }
    })
    res.json({ ok: true })
})

// GET /api/workspaces/:id/members/:userId/profile
// Üzvün ümumi profili + YALNIZ bu workspace-dəki rolu, vəzifəsi və statusu.
// Başqa workspace-lər haqqında, telefon kimi şəxsi məlumatlar barədə heç nə qaytarılmır.
// Pending/rejected/removed üzvlərin profilinə komanda icazəsi olanlar baxa bilər.
router.get('/:id/members/:userId/profile', async (req, res) => {
    const workspaceId = Number(req.params.id)
    const targetId = Number(req.params.userId)
    const me = await getMembership(workspaceId, req.user.id)
    if (!me) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const target = await getAnyMembership(workspaceId, targetId)
    const canViewInactive = me.perms.invite_members || me.perms.remove_members || me.perms.edit_member_titles || me.perms.manage_permissions
    if (!target || (target.status !== 'active' && !canViewInactive)) {
        return res.status(404).json({ error: 'Üzv tapılmadı' })
    }

    const users = await query(
        `SELECT id, name AS first_name, COALESCE(surname, '') AS surname, ${FULL_NAME('users')} AS name,
                email, COALESCE(bio, '') AS bio, avatar_url
         FROM users WHERE id = $1`,
        [targetId]
    )
    res.json({
        profile: users[0],
        membership: {
            role: target.role,
            status: target.status,
            job_title: target.job_title,
            // fərdi icazələr yalnız onları idarə edə bilənə göstərilir
            permissions: me.perms.manage_permissions ? effectivePermissions(target.role, target.permissions) : undefined
        }
    })
})

// ---------------------------------------------------------------- Board yaratmaq

// POST /api/workspaces/:id/boards  { title }
router.post('/:id/boards', async (req, res) => {
    const membership = await getMembership(req.params.id, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })
    if (membership.role !== 'owner') return forbid(res)

    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Board adı tələb olunur' })

    const board = await transaction(async (client) => {
        const created = await client.query(
            'INSERT INTO boards (workspace_id, title) VALUES ($1, $2) RETURNING id, workspace_id, title',
            [req.params.id, title]
        )
        const boardId = created.rows[0].id

        // Əvvəlki GlassKanban-dakı kimi 3 standart sütun
        const defaultColumns = ['Gözləmədə', 'İcra olunur', 'Tamamlandı']
        for (let i = 0; i < defaultColumns.length; i++) {
            await client.query(
                'INSERT INTO columns (board_id, title, position) VALUES ($1, $2, $3)',
                [boardId, defaultColumns[i], i]
            )
        }
        return created.rows[0]
    })

    res.status(201).json({ board })
})

module.exports = router
