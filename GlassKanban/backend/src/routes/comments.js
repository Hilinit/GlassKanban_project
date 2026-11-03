const express = require('express')
const { query } = require('../db')
const requireAuth = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

// DELETE /api/comments/:id  (yalnız şərhin müəllifi silə bilər)
router.delete('/:id', async (req, res) => {
    const rows = await query('SELECT id, user_id FROM comments WHERE id = $1', [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Şərh tapılmadı' })
    if (rows[0].user_id !== req.user.id) {
        return res.status(403).json({ error: 'Yalnız öz şərhini silə bilərsən' })
    }
    await query('DELETE FROM comments WHERE id = $1', [rows[0].id])
    res.json({ ok: true })
})

module.exports = router
