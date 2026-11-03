require('dotenv').config()
require('express-async-errors') // async route-larda xəta olarsa, avtomatik error handler-ə düşür

const express = require('express')
const cors = require('cors')
const { initDb } = require('./db')

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET təyin edilməyib (.env faylına bax).')
    process.exit(1)
}

const app = express()

// İcazə verilən ünvanlar (Vercel və yerli mühit)
const allowedOrigins = [
    'https://glass-kanban-project.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
]

// Əgər .env-də CLIENT_URL təyin olunubsa, onları da əlavə edək
if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(',').forEach(url => {
        const trimmed = url.trim().replace(/\/$/, '')
        if (!allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed)
    })
}

app.use(cors({
    origin(origin, callback) {
        // origin yoxdursa (curl, postman, health check) icazə ver
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(null, false) // CORS başlıqları verilmir, brauzer sorğunu bloklayır
    },
    credentials: true
}))

app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', require('./routes/auth'))
app.use('/api/workspaces', require('./routes/workspaces'))
app.use('/api/boards', require('./routes/boards'))
app.use('/api/columns', require('./routes/columns'))
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/comments', require('./routes/comments'))

// Tapılmayan ünvan
app.use((req, res) => res.status(404).json({ error: 'Ünvan tapılmadı' }))

// Gözlənilməz xətalar (məs. baza xətası)
app.use((err, req, res, next) => {
    // Ünvandakı id rəqəm deyilsə (məs. /boards/abc), baza bu xətanı verir
    if (err.code === '22P02') return res.status(404).json({ error: 'Tapılmadı' })

    console.error(err)
    res.status(500).json({ error: 'Server xətası baş verdi' })
})

const PORT = process.env.PORT || 5000

initDb()
    .then(() => {
        app.listen(PORT, () => console.log(`GlassKanban API ${PORT} portunda işləyir`))
    })
    .catch(err => {
        console.error('Baza ilə əlaqə qurula bilmədi:', err.message)
        process.exit(1)
    })