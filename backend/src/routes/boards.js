const express = require('express')
const { query } = require('../db')
const requireAuth = require('../middleware/auth')
const { getBoardForUser } = require('../access')
const { forbid, FULL_NAME } = require('../http')

const router = express.Router()
router.use(requireAuth)

// GET /api/boards/:id  -> board + üzvlər + sütunlar (içində tapşırıqlarla)
router.get('/:id', async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user.id)
    if (!board) return res.status(404).json({ error: 'Board tapılmadı' })

    const columns = await query(
        'SELECT id, board_id, title, position FROM columns WHERE board_id = $1 ORDER BY position, id',
        [board.id]
    )

    const columnIds = columns.map(c => c.id)
    const tasks = columnIds.length
        ? await query(
            `SELECT t.id, t.column_id, t.title, t.description, t.priority, t.position,
                    to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
                    t.assignee_id, ${FULL_NAME('u')} AS assignee_name, u.avatar_url AS assignee_avatar_url,
                    (SELECT COUNT(*) FROM comments WHERE task_id = t.id)::int AS comment_count
             FROM tasks t
             LEFT JOIN users u ON u.id = t.assignee_id
             WHERE t.column_id = ANY($1)
             ORDER BY t.position, t.id`,
            [columnIds]
        )
        : []

    const members = await query(
        `SELECT u.id, ${FULL_NAME('u')} AS name, u.email, u.avatar_url, m.role
         FROM workspace_members m JOIN users u ON u.id = m.user_id
         WHERE m.workspace_id = $1 AND m.status = 'active'
         ORDER BY u.name`,
        [board.workspace_id]
    )

    const workspaces = await query('SELECT id, name FROM workspaces WHERE id = $1', [board.workspace_id])

    res.json({
        board: { id: board.id, workspace_id: board.workspace_id, title: board.title, created_at: board.created_at },
        workspace: workspaces[0],
        members,
        role: board.my_role,
        permissions: board.perms,
        columns: columns.map(col => ({
            ...col,
            tasks: tasks.filter(t => t.column_id === col.id)
        }))
    })
})

// PATCH /api/boards/:id  { title }
router.patch('/:id', async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user.id)
    if (!board) return res.status(404).json({ error: 'Board tapılmadı' })
    if (board.my_role !== 'owner') return forbid(res)

    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Board adı boş ola bilməz' })

    const rows = await query(
        'UPDATE boards SET title = $1 WHERE id = $2 RETURNING id, workspace_id, title',
        [title, board.id]
    )
    res.json({ board: rows[0] })
})

// DELETE /api/boards/:id
router.delete('/:id', async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user.id)
    if (!board) return res.status(404).json({ error: 'Board tapılmadı' })
    if (board.my_role !== 'owner') return forbid(res)

    await query('DELETE FROM boards WHERE id = $1', [board.id])
    res.json({ ok: true })
})

// POST /api/boards/:id/columns  { title }  -> sona əlavə olunur
router.post('/:id/columns', async (req, res) => {
    const board = await getBoardForUser(req.params.id, req.user.id)
    if (!board) return res.status(404).json({ error: 'Board tapılmadı' })
    if (!board.perms.create_column) return forbid(res)

    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Sütun adı tələb olunur' })

    const rows = await query(
        `INSERT INTO columns (board_id, title, position)
         VALUES ($1, $2, (SELECT COALESCE(MAX(position) + 1, 0) FROM columns WHERE board_id = $1))
         RETURNING id, board_id, title, position`,
        [board.id, title]
    )
    res.status(201).json({ column: { ...rows[0], tasks: [] } })
})

module.exports = router
