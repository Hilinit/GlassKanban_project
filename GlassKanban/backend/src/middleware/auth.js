// Hər qorunan route-dan əvvəl işləyir: token düzgündürsə req.user doldurulur
const jwt = require('jsonwebtoken')

function requireAuth(req, res, next) {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) return res.status(401).json({ error: 'Giriş tələb olunur' })

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.user = { id: payload.id }
        next()
    } catch (err) {
        res.status(401).json({ error: 'Sessiya bitib, yenidən daxil ol' })
    }
}

module.exports = requireAuth
