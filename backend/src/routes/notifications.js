// Bildirişlər: hər istifadəçi yalnız ÖZ bildirişlərini görür və dəyişir (user_id həmişə JWT-dəndir)
const express = require('express')
const { query } = require('../db')
const requireAuth = require('../middleware/auth')
const { FULL_NAME } = require('../http')

const router = express.Router()
router.use(requireAuth)

async function unreadCount(userId) {
    const rows = await query('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND NOT is_read', [userId])
    return rows[0].n
}

// GET /api/notifications?limit=50  -> bildirişlər (yeni -> köhnə) + oxunmamışların sayı
router.get('/', async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100)

    const notifications = await query(
        `SELECT n.id, n.type, n.is_read, n.created_at, n.workspace_id, n.actor_id, ${FULL_NAME('a')} AS actor_name,
                -- workspace adı yalnız dəvət bildirişində və ya istifadəçi hələ də aktiv üzv olduqda göstərilir
                CASE WHEN n.type = 'invitation' OR EXISTS (
                         SELECT 1 FROM workspace_members me
                         WHERE me.workspace_id = n.workspace_id AND me.user_id = n.user_id AND me.status = 'active')
                     THEN w.name END AS workspace_name,
                -- dəvətin hazırkı vəziyyəti: qəbul/rədd düymələri yalnız 'pending' olanda göstərilməlidir
                CASE WHEN n.type = 'invitation' THEN
                     (SELECT me.status FROM workspace_members me
                      WHERE me.workspace_id = n.workspace_id AND me.user_id = n.user_id) END AS membership_status
         FROM notifications n
         LEFT JOIN workspaces w ON w.id = n.workspace_id
         LEFT JOIN users a ON a.id = n.actor_id
         WHERE n.user_id = $1
         ORDER BY n.id DESC
         LIMIT $2`,
        [req.user.id, limit]
    )
    res.json({ notifications, unread_count: await unreadCount(req.user.id) })
})

// GET /api/notifications/unread-count
router.get('/unread-count', async (req, res) => {
    res.json({ unread_count: await unreadCount(req.user.id) })
})

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
    await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND NOT is_read', [req.user.id])
    res.json({ ok: true, unread_count: 0 })
})

// POST /api/notifications/:id/read
router.post('/:id/read', async (req, res) => {
    const rows = await query(
        'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
        [req.params.id, req.user.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Bildiriş tapılmadı' })
    res.json({ ok: true, unread_count: await unreadCount(req.user.id) })
})

module.exports = router
