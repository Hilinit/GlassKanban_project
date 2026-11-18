// Şəxsi profil: BÜTÜN workspace-lər üçün ümumi olan məlumatlar (users cədvəli).
// Rol, vəzifə və icazələr burada YOXDUR: onlar hər workspace üçün ayrıca saxlanılır.
const express = require('express')
const { query } = require('../db')
const requireAuth = require('../middleware/auth')

const router = express.Router()
router.use(requireAuth)

const AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_AVATAR_LENGTH = 250000 // təxminən 180 KB (frontend şəkli 256px-ə kiçildir)
const PROFILE_FIELDS = 'id, name, surname, email, phone, bio, avatar_url'

function profileOf(row) {
    return {
        id: row.id,
        name: `${row.name} ${row.surname || ''}`.trim(),
        first_name: row.name,
        surname: row.surname || '',
        email: row.email,
        phone: row.phone || '',
        bio: row.bio || '',
        avatar_url: row.avatar_url || null
    }
}

// GET /api/profile  -> yalnız öz profilim
router.get('/', async (req, res) => {
    const rows = await query(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = $1`, [req.user.id])
    if (rows.length === 0) return res.status(404).json({ error: 'İstifadəçi tapılmadı' })
    res.json({ profile: profileOf(rows[0]) })
})

// PUT /api/profile  { first_name, surname, phone, bio, avatar_url }  (e-poçt və id dəyişdirilmir)
router.put('/', async (req, res) => {
    const rows = await query(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = $1`, [req.user.id])
    if (rows.length === 0) return res.status(404).json({ error: 'İstifadəçi tapılmadı' })
    const current = rows[0]
    const has = (key) => Object.prototype.hasOwnProperty.call(req.body, key)

    const firstName = has('first_name') ? String(req.body.first_name || '').trim() : current.name
    const surname = has('surname') ? String(req.body.surname || '').trim() : (current.surname || '')
    const phone = has('phone') ? String(req.body.phone || '').trim() : (current.phone || '')
    const bio = has('bio') ? String(req.body.bio || '').trim() : (current.bio || '')
    let avatar = current.avatar_url

    if (!firstName) return res.status(400).json({ error: 'Ad boş ola bilməz' })
    if (firstName.length > 100 || surname.length > 100) return res.status(400).json({ error: 'Ad və ya soyad çox uzundur' })
    if (phone.length > 40) return res.status(400).json({ error: 'Telefon nömrəsi çox uzundur' })
    if (bio.length > 500) return res.status(400).json({ error: 'Haqqında mətni çox uzundur (maks. 500 simvol)' })

    if (has('avatar_url')) {
        avatar = req.body.avatar_url || null
        if (avatar && (avatar.length > MAX_AVATAR_LENGTH || !AVATAR_PATTERN.test(avatar))) {
            return res.status(400).json({ error: 'Profil şəkli yanlışdır (PNG, JPEG və ya WEBP, kiçik ölçülü olmalıdır)' })
        }
    }

    const updated = await query(
        `UPDATE users SET name = $1, surname = $2, phone = $3, bio = $4, avatar_url = $5
         WHERE id = $6 RETURNING ${PROFILE_FIELDS}`,
        [firstName, surname || null, phone || null, bio || null, avatar, req.user.id]
    )
    res.json({ profile: profileOf(updated[0]) })
})

module.exports = router
