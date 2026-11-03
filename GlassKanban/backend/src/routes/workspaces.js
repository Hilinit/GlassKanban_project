const express = require('express')
const { query, transaction } = require('../db')
const requireAuth = require('../middleware/auth')
const { getMembership } = require('../access')

const router = express.Router()
router.use(requireAuth)

// GET /api/workspaces  -> mənim workspace-lərim + içindəki board-lar
router.get('/', async (req, res) => {
    const workspaces = await query(
        `SELECT w.id, w.name, w.owner_id, m.role,
                (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::int AS member_count
         FROM workspaces w
         JOIN workspace_members m ON m.workspace_id = w.id
         WHERE m.user_id = $1
         ORDER BY w.id`,
        [req.user.id]
    )

    const ids = workspaces.map(w => w.id)
    const boards = ids.length
        ? await query('SELECT id, workspace_id, title FROM boards WHERE workspace_id = ANY($1) ORDER BY id', [ids])
        : []

    const result = workspaces.map(w => ({
        ...w,
        boards: boards.filter(b => b.workspace_id === w.id)
    }))
    res.json({ workspaces: result })
})

// POST /api/workspaces  { name }
router.post('/', async (req, res) => {
    const name = (req.body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Workspace adı tələb olunur' })

    const workspace = await transaction(async (client) => {
        const ws = await client.query(
            'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id',
            [name, req.user.id]
        )
        await client.query(
            "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
            [ws.rows[0].id, req.user.id]
        )
        return ws.rows[0]
    })

    res.status(201).json({ workspace: { ...workspace, role: 'owner', member_count: 1, boards: [] } })
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
        `SELECT u.id, u.name, u.email, m.role
         FROM workspace_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.workspace_id = $1
         ORDER BY (m.role = 'owner') DESC, u.name`,
        [req.params.id]
    )
    res.json({ members })
})

// POST /api/workspaces/:id/members  { email }
router.post('/:id/members', async (req, res) => {
    const membership = await getMembership(req.params.id, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const email = (req.body.email || '').trim().toLowerCase()
    if (!email) return res.status(400).json({ error: 'E-poçt tələb olunur' })

    const users = await query('SELECT id, name, email FROM users WHERE email = $1', [email])
    if (users.length === 0) {
        return res.status(404).json({ error: 'Bu e-poçtla istifadəçi tapılmadı. Əvvəlcə qeydiyyatdan keçməlidir.' })
    }
    const user = users[0]

    const already = await getMembership(req.params.id, user.id)
    if (already) return res.status(409).json({ error: 'Bu istifadəçi artıq üzvdür' })

    await query(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'member')",
        [req.params.id, user.id]
    )
    res.status(201).json({ member: { ...user, role: 'member' } })
})

// DELETE /api/workspaces/:id/members/:userId
// Owner hər kəsi çıxara bilər, üzv isə yalnız özünü (workspace-dən ayrılmaq)
router.delete('/:id/members/:userId', async (req, res) => {
    const workspaceId = Number(req.params.id)
    const targetId = Number(req.params.userId)

    const membership = await getMembership(workspaceId, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })

    const isSelf = targetId === req.user.id
    if (membership.role !== 'owner' && !isSelf) {
        return res.status(403).json({ error: 'Üzvü yalnız workspace sahibi çıxara bilər' })
    }

    const target = await getMembership(workspaceId, targetId)
    if (!target) return res.status(404).json({ error: 'Üzv tapılmadı' })
    if (target.role === 'owner') {
        return res.status(400).json({ error: 'Workspace sahibi çıxarıla bilməz' })
    }

    await transaction(async (client) => {
        await client.query(
            'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
            [workspaceId, targetId]
        )
        // Bu istifadəçiyə təyin olunmuş tapşırıqlar "təyin olunmayıb" olur
        await client.query(
            `UPDATE tasks SET assignee_id = NULL
             WHERE assignee_id = $2
               AND column_id IN (
                   SELECT c.id FROM columns c JOIN boards b ON b.id = c.board_id
                   WHERE b.workspace_id = $1)`,
            [workspaceId, targetId]
        )
    })
    res.json({ ok: true })
})

// ---------------------------------------------------------------- Board yaratmaq

// POST /api/workspaces/:id/boards  { title }
router.post('/:id/boards', async (req, res) => {
    const membership = await getMembership(req.params.id, req.user.id)
    if (!membership) return res.status(404).json({ error: 'Workspace tapılmadı' })

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
