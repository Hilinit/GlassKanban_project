const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../db')
const requireAuth = require('../middleware/auth')

const router = express.Router()

// Frontend-ə göndərilən istifadəçi: name = tam ad (ad + soyad), first_name/surname ayrıca
function publicUser(row) {
    return {
        id: row.id,
        name: `${row.name} ${row.surname || ''}`.trim(),
        first_name: row.name,
        surname: row.surname || '',
        email: row.email,
        avatar_url: row.avatar_url || null
    }
}

function makeToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const name = (req.body.name || '').trim()
    const surname = (req.body.surname || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Ad, e-poçt və şifrə tələb olunur' })
    }
    if (name.length > 100 || surname.length > 100) {
        return res.status(400).json({ error: 'Ad və ya soyad çox uzundur' })
    }
    if (!email.includes('@')) {
        return res.status(400).json({ error: 'E-poçt düzgün deyil' })
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Şifrə ən azı 6 simvol olmalıdır' })
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.length > 0) {
        return res.status(409).json({ error: 'Bu e-poçt artıq qeydiyyatdan keçib' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const rows = await query(
        'INSERT INTO users (name, surname, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, surname, email, avatar_url',
        [name, surname || null, email, passwordHash]
    )
    const user = rows[0]

    // Yeni istifadəçiyə avtomatik ilk workspace verilir ki, boş ekranla qarşılaşmasın
    const ws = await query(
        'INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id',
        [name + ' workspace', user.id]
    )
    await query(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner')",
        [ws[0].id, user.id]
    )

    res.status(201).json({ token: makeToken(user.id), user: publicUser(user) })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''

    const rows = await query('SELECT * FROM users WHERE email = $1', [email])
    const user = rows[0]

    // Eyni mesaj: e-poçtun olub-olmadığını bildirmirik
    const ok = user && (await bcrypt.compare(password, user.password_hash))
    if (!ok) return res.status(401).json({ error: 'E-poçt və ya şifrə yanlışdır' })

    res.json({
        token: makeToken(user.id),
        user: publicUser(user)
    })
})

// GET /api/auth/me  (token hələ də etibarlıdırmı?)
router.get('/me', requireAuth, async (req, res) => {
    const rows = await query('SELECT id, name, surname, email, avatar_url FROM users WHERE id = $1', [req.user.id])
    if (rows.length === 0) return res.status(401).json({ error: 'İstifadəçi tapılmadı' })
    res.json({ user: publicUser(rows[0]) })
})

module.exports = router
