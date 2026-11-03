const express = require('express')
const { query, transaction } = require('../db')
const requireAuth = require('../middleware/auth')
const { getColumnForUser } = require('../access')
const { saveOrder, insertAt } = require('../order')
const { loadTask, validateTaskInput } = require('./tasks')

const router = express.Router()
router.use(requireAuth)

// PATCH /api/columns/:id  { title }
router.patch('/:id', async (req, res) => {
    const column = await getColumnForUser(req.params.id, req.user.id)
    if (!column) return res.status(404).json({ error: 'Sütun tapılmadı' })

    const title = (req.body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Sütun adı boş ola bilməz' })

    const rows = await query(
        'UPDATE columns SET title = $1 WHERE id = $2 RETURNING id, board_id, title, position',
        [title, column.id]
    )
    res.json({ column: rows[0] })
})

// PATCH /api/columns/:id/move  { position }  -> sütunu başqa yerə köçürür
router.patch('/:id/move', async (req, res) => {
    const column = await getColumnForUser(req.params.id, req.user.id)
    if (!column) return res.status(404).json({ error: 'Sütun tapılmadı' })

    await transaction(async (client) => {
        const result = await client.query(
            'SELECT id FROM columns WHERE board_id = $1 ORDER BY position, id',
            [column.board_id]
        )
        const ids = result.rows.map(r => r.id)
        await saveOrder(client, 'columns', insertAt(ids, column.id, req.body.position))
    })
    res.json({ ok: true })
})

// DELETE /api/columns/:id  (içindəki tapşırıqlar da silinir)
router.delete('/:id', async (req, res) => {
    const column = await getColumnForUser(req.params.id, req.user.id)
    if (!column) return res.status(404).json({ error: 'Sütun tapılmadı' })

    await transaction(async (client) => {
        await client.query('DELETE FROM columns WHERE id = $1', [column.id])
        const result = await client.query(
            'SELECT id FROM columns WHERE board_id = $1 ORDER BY position, id',
            [column.board_id]
        )
        await saveOrder(client, 'columns', result.rows.map(r => r.id))
    })
    res.json({ ok: true })
})

// POST /api/columns/:id/tasks  { title, description?, priority?, due_date?, assignee_id? }
router.post('/:id/tasks', async (req, res) => {
    const column = await getColumnForUser(req.params.id, req.user.id)
    if (!column) return res.status(404).json({ error: 'Sütun tapılmadı' })

    const { error, values } = await validateTaskInput(req.body, column.workspace_id, null)
    if (error) return res.status(400).json({ error })

    const rows = await query(
        `INSERT INTO tasks (column_id, title, description, priority, due_date, assignee_id, created_by, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7,
                 (SELECT COALESCE(MAX(position) + 1, 0) FROM tasks WHERE column_id = $1))
         RETURNING id`,
        [column.id, values.title, values.description, values.priority,
         values.due_date, values.assignee_id, req.user.id]
    )
    const task = await loadTask(rows[0].id)
    res.status(201).json({ task })
})

module.exports = router
