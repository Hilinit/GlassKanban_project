const express = require('express')
const { query } = require('../db')
const requireAuth = require('../middleware/auth')
const { getCommentForUser } = require('../access')

const router = express.Router()
router.use(requireAuth)

// DELETE /api/comments/:id  (yalnız şərhin müəllifi və hələ də həmin workspace-in aktiv üzvü olduqda)
router.delete('/:id', async (req, res) => {
    const comment = await getCommentForUser(req.params.id, req.user.id)
    if (!comment) return res.status(404).json({ error: 'Şərh tapılmadı' })
    if (comment.user_id !== req.user.id || !comment.perms.delete_own_comment) return res.status(403).json({ error: 'Öz şərhini silmək icazən yoxdur' })
    await query('DELETE FROM comments WHERE id = $1', [comment.id])
    res.json({ ok: true })
})

module.exports = router
