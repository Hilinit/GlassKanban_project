// Workspace dəvətləri: istifadəçi yalnız ÖZ dəvətlərini qəbul və ya rədd edir.
// Hər dəvət yalnız öz workspace-i üçün keçərlidir (cavab ünvandakı workspaceId ilə istifadəçinin həmin workspace-dəki 'pending' sətrinə təsir edir).
const express = require('express')
const { query, transaction } = require('../db')
const requireAuth = require('../middleware/auth')
const { FULL_NAME } = require('../http')
const { notify } = require('../notify')

const router = express.Router()
router.use(requireAuth)

// GET /api/invitations  -> mənim gözləyən dəvətlərim
router.get('/', async (req, res) => {
    const invitations = await query(
        `SELECT m.workspace_id, w.name AS workspace_name, m.role, m.job_title, m.invited_at, ${FULL_NAME('u')} AS invited_by_name
         FROM workspace_members m
         JOIN workspaces w ON w.id = m.workspace_id
         LEFT JOIN users u ON u.id = m.invited_by
         WHERE m.user_id = $1 AND m.status = 'pending'
         ORDER BY m.invited_at DESC`,
        [req.user.id]
    )
    res.json({ invitations })
})

async function respond(req, res, newStatus) {
    const workspaceId = Number(req.params.workspaceId)

    const result = await transaction(async (client) => {
        const updated = await client.query(
            `UPDATE workspace_members
             SET status = $3, responded_at = NOW(), updated_at = NOW()
             WHERE workspace_id = $1 AND user_id = $2 AND status = 'pending'
             RETURNING invited_by`,
            [workspaceId, req.user.id, newStatus]
        )
        if (updated.rows.length === 0) return null

        // bu dəvətin bildirişi oxunmuş sayılır
        await client.query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND workspace_id = $2 AND type = 'invitation'",
            [req.user.id, workspaceId]
        )

        // Rəhbərə bildiriş: dəvət edən şəxsə və (fərqlidirsə) workspace sahibinə
        const owner = await client.query('SELECT owner_id FROM workspaces WHERE id = $1', [workspaceId])
        const targets = new Set([owner.rows[0] && owner.rows[0].owner_id, updated.rows[0].invited_by].filter(Boolean))
        targets.delete(req.user.id)
        const type = newStatus === 'active' ? 'invitation_accepted' : 'invitation_rejected'
        for (const userId of targets) await notify(userId, workspaceId, req.user.id, type, client)
        return true
    })
    if (!result) return res.status(404).json({ error: 'Gözləyən dəvət tapılmadı' })

    res.json({ ok: true, status: newStatus })
}

// POST /api/invitations/:workspaceId/accept  -> üzvlük 'active' olur
router.post('/:workspaceId/accept', (req, res) => respond(req, res, 'active'))

// POST /api/invitations/:workspaceId/reject  -> üzvlük 'rejected' olur
router.post('/:workspaceId/reject', (req, res) => respond(req, res, 'rejected'))

module.exports = router
