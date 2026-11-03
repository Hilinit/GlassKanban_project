const express = require('express')
const { query, transaction } = require('../db')
const requireAuth = require('../middleware/auth')
const { getTaskForUser, getColumnForUser, getMembership } = require('../access')
const { saveOrder, insertAt } = require('../order')

const router = express.Router()
router.use(requireAuth)

const PRIORITIES = ['low', 'medium', 'high']

// Tapşırığı lövhədə göründüyü formada qaytarır (assignee adı + şərh sayı ilə)
async function loadTask(taskId) {
    const rows = await query(
        `SELECT t.id, t.column_id, t.title, t.description, t.priority, t.position,
                to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
                t.assignee_id, u.name AS assignee_name,
                (SELECT COUNT(*) FROM comments WHERE task_id = t.id)::int AS comment_count
         FROM tasks t
         LEFT JOIN users u ON u.id = t.assignee_id
         WHERE t.id = $1`,
        [taskId]
    )
    return rows[0]
}

// Göndərilən məlumatı yoxlayır. `existing` varsa, göndərilməyən sahələr köhnə qiymətini saxlayır.
// Qaytarır: { error } və ya { values }
async function validateTaskInput(body, workspaceId, existing) {
    const has = (key) => Object.prototype.hasOwnProperty.call(body, key)

    const title = has('title') ? String(body.title || '').trim() : existing.title
    if (!title) return { error: 'Tapşırıq başlığı tələb olunur' }
    if (title.length > 200) return { error: 'Başlıq çox uzundur (maks. 200 simvol)' }

    const description = has('description') ? String(body.description || '').trim() : (existing ? existing.description : '')

    const priority = has('priority') ? body.priority : (existing ? existing.priority : 'low')
    if (!PRIORITIES.includes(priority)) return { error: 'Prioritet yanlışdır' }

    let due_date = existing ? existing.due_date : null
    if (has('due_date')) {
        due_date = body.due_date || null
        if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) return { error: 'Tarix formatı yanlışdır' }
    }

    let assignee_id = existing ? existing.assignee_id : null
    if (has('assignee_id')) {
        assignee_id = body.assignee_id ? Number(body.assignee_id) : null
        if (assignee_id) {
            const member = await getMembership(workspaceId, assignee_id)
            if (!member) return { error: 'Təyin olunan şəxs bu workspace-in üzvü deyil' }
        }
    }

    return { values: { title, description, priority, due_date, assignee_id } }
}

// GET /api/tasks/:id  -> tapşırıq + şərhlər
router.get('/:id', async (req, res) => {
    const found = await getTaskForUser(req.params.id, req.user.id)
    if (!found) return res.status(404).json({ error: 'Tapşırıq tapılmadı' })

    const task = await loadTask(found.id)
    const comments = await query(
        `SELECT c.id, c.text, c.created_at, c.user_id, u.name AS user_name
         FROM comments c LEFT JOIN users u ON u.id = c.user_id
         WHERE c.task_id = $1
         ORDER BY c.created_at, c.id`,
        [found.id]
    )
    res.json({ task, comments })
})

// PATCH /api/tasks/:id  { title?, description?, priority?, due_date?, assignee_id? }
router.patch('/:id', async (req, res) => {
    const found = await getTaskForUser(req.params.id, req.user.id)
    if (!found) return res.status(404).json({ error: 'Tapşırıq tapılmadı' })

    const { error, values } = await validateTaskInput(req.body, found.workspace_id, found)
    if (error) return res.status(400).json({ error })

    await query(
        `UPDATE tasks SET title = $1, description = $2, priority = $3, due_date = $4, assignee_id = $5
         WHERE id = $6`,
        [values.title, values.description, values.priority, values.due_date, values.assignee_id, found.id]
    )
    res.json({ task: await loadTask(found.id) })
})

// PATCH /api/tasks/:id/move  { column_id, position }
// Tapşırığı başqa sütuna (və ya eyni sütunda başqa yerə) köçürür
router.patch('/:id/move', async (req, res) => {
    const found = await getTaskForUser(req.params.id, req.user.id)
    if (!found) return res.status(404).json({ error: 'Tapşırıq tapılmadı' })

    const targetColumn = await getColumnForUser(req.body.column_id, req.user.id)
    if (!targetColumn || targetColumn.board_id !== found.board_id) {
        return res.status(400).json({ error: 'Hədəf sütun yanlışdır' })
    }

    await transaction(async (client) => {
        const sameColumn = targetColumn.id === found.column_id

        // Hədəf sütundakı tapşırıqların sırası
        const target = await client.query(
            'SELECT id FROM tasks WHERE column_id = $1 ORDER BY position, id',
            [targetColumn.id]
        )
        const newOrder = insertAt(target.rows.map(r => r.id), found.id, req.body.position)

        await client.query('UPDATE tasks SET column_id = $1 WHERE id = $2', [targetColumn.id, found.id])
        await saveOrder(client, 'tasks', newOrder)

        // Başqa sütundan gəlibsə, köhnə sütunun boşluğunu bağla
        if (!sameColumn) {
            const source = await client.query(
                'SELECT id FROM tasks WHERE column_id = $1 ORDER BY position, id',
                [found.column_id]
            )
            await saveOrder(client, 'tasks', source.rows.map(r => r.id))
        }
    })
    res.json({ ok: true })
})

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
    const found = await getTaskForUser(req.params.id, req.user.id)
    if (!found) return res.status(404).json({ error: 'Tapşırıq tapılmadı' })

    await query('DELETE FROM tasks WHERE id = $1', [found.id])
    res.json({ ok: true })
})

// POST /api/tasks/:id/comments  { text }
router.post('/:id/comments', async (req, res) => {
    const found = await getTaskForUser(req.params.id, req.user.id)
    if (!found) return res.status(404).json({ error: 'Tapşırıq tapılmadı' })

    const text = (req.body.text || '').trim()
    if (!text) return res.status(400).json({ error: 'Şərh boş ola bilməz' })

    const rows = await query(
        `INSERT INTO comments (task_id, user_id, text) VALUES ($1, $2, $3)
         RETURNING id, text, created_at, user_id`,
        [found.id, req.user.id, text]
    )
    const users = await query('SELECT name FROM users WHERE id = $1', [req.user.id])
    res.status(201).json({ comment: { ...rows[0], user_name: users[0].name } })
})

module.exports = router
module.exports.loadTask = loadTask
module.exports.validateTaskInput = validateTaskInput
