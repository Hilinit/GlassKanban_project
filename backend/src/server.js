require('dotenv').config()
require('express-async-errors') // async route-larda xəta olarsa, avtomatik error handler-ə düşür

const express = require('express')
const cors = require('cors')
const { initDb, pool } = require('./db')
const { migrationStatus } = require('./migrate')

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET təyin edilməyib (.env faylına bax).')
    process.exit(1)
}

const app = express()

// Yalnız bizim frontend ünvanlarından gələn sorğulara icazə verilir
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',')
    .map(url => url.trim().replace(/\/$/, ''))

app.use(cors({
    origin(origin, callback) {
        // origin yoxdursa (curl, health check) icazə ver
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(null, false) // CORS başlıqları verilmir, brauzer sorğunu özü bloklayır
    }
}))
app.use(express.json({ limit: '300kb' })) // profil şəkli (kiçildilmiş) üçün bir az böyük limit

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', require('./routes/auth'))
app.use('/api/profile', require('./routes/profile'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/invitations', require('./routes/invitations'))
app.use('/api/workspaces', require('./routes/workspaces'))
app.use('/api/boards', require('./routes/boards'))
app.use('/api/columns', require('./routes/columns'))
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/comments', require('./routes/comments'))

// Tapılmayan ünvan
app.use((req, res) => res.status(404).json({ error: 'Ünvan tapılmadı' }))

// Gözlənilməz xətalar (məs. baza xətası)
app.use((err, req, res, next) => {
    // Ünvandakı id rəqəm deyilsə (/boards/abc) və ya çox böyükdürsə (/boards/99999999999), baza bu xətaları verir
    if (err.code === '22P02' || err.code === '22003') return res.status(404).json({ error: 'Tapılmadı' })
    // Yanlış formatlı və ya həddindən böyük JSON gövdəsi: müştəri xətasıdır, 500 yox
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Sorğunun formatı yanlışdır' })
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Göndərilən məlumat çox böyükdür' })

    console.error(err)
    res.status(500).json({ error: 'Server xətası baş verdi' })
})

const PORT = process.env.PORT || 5000

initDb()
    .then(async () => {
        // Bu kod migration olmadan işləyə bilməz. Migration bu server tərəfindən AVTOMATİK İCRA OLUNMUR,
        // yalnız yoxlanılır; tətbiq olunmayıbsa server başlamır və bazaya toxunmur.
        const { pending } = await migrationStatus(pool)
        if (pending.length > 0) {
            console.error('Baza migration-ı tətbiq olunmayıb: ' + pending.join(', '))
            console.error('Əvvəlcə bazanı yeniləyin:  npm run migrate -- --yes   (təlimat: README.md)')
            process.exit(1)
        }
        app.listen(PORT, () => console.log(`GlassKanban API ${PORT} portunda işləyir`))
    })
    .catch(err => {
        console.error('Baza ilə əlaqə qurula bilmədi:', err.message)
        process.exit(1)
    })
